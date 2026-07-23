import os
import json
import re
import copy
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables from the parent directory where .env is located
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI is not set in the environment variables.")

# Configure the client securely with standard TLS verification and 5s timeout
client = AsyncIOMotorClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=5000,
)

# Target the database specified in the URI, fallback to 'gstrecounciliation_user'
db = client.get_default_database("gstrecounciliation_user")

# Raw MongoDB Collections
raw_users_collection = db.users
raw_otps_collection = db.otps


# ─────────────────────────────────────────────────────────────────────────────
# Local Async Collection implementation for non-auth data (Reconciliation, Runs, Uploads)
# ─────────────────────────────────────────────────────────────────────────────

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)


class LocalCursor:
    def __init__(self, docs: list[dict]):
        self._docs = docs
        self._sort_key = None
        self._sort_desc = False
        self._skip_val = 0
        self._limit_val = None

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            if key_or_list:
                key, direction = key_or_list[0]
                self._sort_key = key
                self._sort_desc = (direction == -1 or direction == "desc")
        elif isinstance(key_or_list, str):
            self._sort_key = key_or_list
            self._sort_desc = (direction == -1 or direction == "desc")
        return self

    def skip(self, count: int):
        self._skip_val = max(0, count)
        return self

    def limit(self, count: int):
        self._limit_val = max(0, count)
        return self

    async def to_list(self, length: int = None) -> list[dict]:
        res = list(self._docs)
        if self._sort_key:
            def sort_val(item):
                val = item.get(self._sort_key)
                if val is None:
                    return ""
                return val
            res.sort(key=sort_val, reverse=self._sort_desc)

        if self._skip_val:
            res = res[self._skip_val:]

        limit_to_apply = length if length is not None else self._limit_val
        if limit_to_apply is not None and limit_to_apply >= 0:
            res = res[:limit_to_apply]

        return [copy.deepcopy(d) for d in res]


class LocalAsyncCollection:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self.file_path = os.path.join(DATA_DIR, f"{collection_name}.json")
        self._docs = []
        self._lock = asyncio.Lock()
        self._load()

    def _load(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    self._docs = json.load(f)
            except Exception:
                self._docs = []
        else:
            self._docs = []

    def _save(self):
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(self._docs, f, default=str, indent=2)
        except Exception as e:
            print(f"Error saving local collection {self.collection_name}: {e}")

    def _matches(self, doc: dict, query: dict) -> bool:
        if not query:
            return True
        
        # Handle $or operator
        if "$or" in query:
            sub_queries = query["$or"]
            other_query = {k: v for k, v in query.items() if k != "$or"}
            if other_query and not self._matches(doc, other_query):
                return False
            return any(self._matches(doc, q) for q in sub_queries)

        for field, condition in query.items():
            doc_val = doc.get(field)
            if isinstance(condition, dict):
                for op, val in condition.items():
                    if op == "$gt":
                        if doc_val is None or not (doc_val > val):
                            return False
                    elif op == "$gte":
                        if doc_val is None or not (doc_val >= val):
                            return False
                    elif op == "$lt":
                        if doc_val is None or not (doc_val < val):
                            return False
                    elif op == "$lte":
                        if doc_val is None or not (doc_val <= val):
                            return False
                    elif op == "$in":
                        if doc_val not in val:
                            return False
                    elif op == "$regex":
                        flags = re.IGNORECASE if condition.get("$options") == "i" else 0
                        if doc_val is None or not re.search(str(val), str(doc_val), flags):
                            return False
            else:
                if doc_val != condition:
                    return False
        return True

    def _project(self, doc: dict, projection: dict) -> dict:
        if not projection:
            return copy.deepcopy(doc)
        
        res = copy.deepcopy(doc)
        # Exclude projection e.g. {"_id": 0, "records": 0}
        exclusions = [k for k, v in projection.items() if v == 0]
        inclusions = [k for k, v in projection.items() if v == 1]

        if exclusions and not inclusions:
            for k in exclusions:
                res.pop(k, None)
            return res
        elif inclusions:
            filtered = {}
            for k in inclusions:
                if k in doc:
                    filtered[k] = doc[k]
            if projection.get("_id") != 0 and "_id" in doc:
                filtered["_id"] = doc["_id"]
            return filtered

        return res

    async def find_one(self, query: dict = None, projection: dict = None, sort=None) -> dict | None:
        async with self._lock:
            query = query or {}
            matching = [d for d in self._docs if self._matches(d, query)]
            if sort:
                key, direction = sort[0] if isinstance(sort, list) else (sort, 1)
                matching.sort(key=lambda x: x.get(key) or "", reverse=(direction == -1))
            if matching:
                return self._project(matching[0], projection)
            return None

    def find(self, query: dict = None, projection: dict = None) -> LocalCursor:
        query = query or {}
        matching = [self._project(d, projection) for d in self._docs if self._matches(d, query)]
        return LocalCursor(matching)

    async def insert_one(self, document: dict):
        async with self._lock:
            doc_copy = copy.deepcopy(document)
            self._docs.append(doc_copy)
            self._save()
            class InsertOneResult:
                def __init__(self, inserted_id):
                    self.inserted_id = inserted_id
            return InsertOneResult(doc_copy.get("_id", "local_id"))

    async def insert_many(self, documents: list[dict]):
        async with self._lock:
            docs_copy = [copy.deepcopy(d) for d in documents]
            self._docs.extend(docs_copy)
            self._save()
            class InsertManyResult:
                def __init__(self, inserted_ids):
                    self.inserted_ids = inserted_ids
            return InsertManyResult([d.get("_id", i) for i, d in enumerate(docs_copy)])

    async def update_one(self, query: dict, update: dict, upsert: bool = False):
        async with self._lock:
            target = None
            for d in self._docs:
                if self._matches(d, query):
                    target = d
                    break
            
            if target is not None:
                if "$set" in update:
                    for k, v in update["$set"].items():
                        target[k] = copy.deepcopy(v)
                self._save()
                class UpdateResult:
                    matched_count = 1
                    modified_count = 1
                return UpdateResult()
            elif upsert:
                new_doc = copy.deepcopy(query)
                if "$set" in update:
                    for k, v in update["$set"].items():
                        new_doc[k] = copy.deepcopy(v)
                self._docs.append(new_doc)
                self._save()
                class UpdateResultUpsert:
                    matched_count = 0
                    modified_count = 1
                return UpdateResultUpsert()

            class UpdateResultNone:
                matched_count = 0
                modified_count = 0
            return UpdateResultNone()

    async def delete_one(self, query: dict):
        async with self._lock:
            idx_to_remove = None
            for i, d in enumerate(self._docs):
                if self._matches(d, query):
                    idx_to_remove = i
                    break
            if idx_to_remove is not None:
                self._docs.pop(idx_to_remove)
                self._save()
                class DeleteResultOne:
                    deleted_count = 1
                return DeleteResultOne()
            class DeleteResultZero:
                deleted_count = 0
            return DeleteResultZero()

    async def delete_many(self, query: dict):
        async with self._lock:
            if not query:
                deleted = len(self._docs)
                self._docs = []
                self._save()
                class DeleteResultAll:
                    deleted_count = deleted
                return DeleteResultAll()

            original_len = len(self._docs)
            self._docs = [d for d in self._docs if not self._matches(d, query)]
            deleted = original_len - len(self._docs)
            if deleted > 0:
                self._save()
            class DeleteResultMany:
                deleted_count = deleted
            return DeleteResultMany()

    async def count_documents(self, query: dict) -> int:
        async with self._lock:
            return sum(1 for d in self._docs if self._matches(d, query))

    def _get_nested(self, doc: dict, field_path: str):
        """Resolve dot-notation field paths like 'summary.partial' from a document."""
        parts = field_path.split(".")
        val = doc
        for part in parts:
            if isinstance(val, dict):
                val = val.get(part)
            else:
                return None
        return val

    def _eval_cond(self, cond_expr, doc: dict) -> bool:
        """Evaluate a MongoDB conditional expression ($gte, $lt, $and, $or, etc.) against a document."""
        if isinstance(cond_expr, list) and len(cond_expr) == 3:
            # Legacy array-style $cond: [condition, then, else]
            condition, then_val, else_val = cond_expr
            return then_val if self._eval_cond(condition, doc) else else_val
        if not isinstance(cond_expr, dict):
            return bool(cond_expr)
        for op, args in cond_expr.items():
            if op == "$gte":
                left = self._resolve_expr(args[0], doc)
                right = self._resolve_expr(args[1], doc)
                return left is not None and left >= right
            elif op == "$gt":
                left = self._resolve_expr(args[0], doc)
                right = self._resolve_expr(args[1], doc)
                return left is not None and left > right
            elif op == "$lt":
                left = self._resolve_expr(args[0], doc)
                right = self._resolve_expr(args[1], doc)
                return left is not None and left < right
            elif op == "$lte":
                left = self._resolve_expr(args[0], doc)
                right = self._resolve_expr(args[1], doc)
                return left is not None and left <= right
            elif op == "$and":
                return all(self._eval_cond(a, doc) for a in args)
            elif op == "$or":
                return any(self._eval_cond(a, doc) for a in args)
            elif op == "$eq":
                return self._resolve_expr(args[0], doc) == self._resolve_expr(args[1], doc)
        return False

    def _resolve_expr(self, expr, doc: dict):
        """Resolve an expression value — field reference ($field) or literal."""
        if isinstance(expr, str) and expr.startswith("$"):
            return self._get_nested(doc, expr[1:])
        return expr

    def _eval_agg_expr(self, expr, doc: dict):
        """Evaluate a MongoDB aggregation expression against a document (for $sum, $cond, $ifNull)."""
        if isinstance(expr, (int, float)):
            return expr
        if isinstance(expr, str) and expr.startswith("$"):
            return self._get_nested(doc, expr[1:]) or 0
        if isinstance(expr, dict):
            if "$cond" in expr:
                cond_args = expr["$cond"]
                if isinstance(cond_args, list):
                    condition, then_val, else_val = cond_args
                    result = self._eval_cond(condition, doc)
                    return then_val if result else else_val
                elif isinstance(cond_args, dict):
                    condition = cond_args.get("if")
                    then_val = cond_args.get("then", 1)
                    else_val = cond_args.get("else", 0)
                    result = self._eval_cond(condition, doc)
                    return then_val if result else else_val
            elif "$ifNull" in expr:
                args = expr["$ifNull"]
                val = self._resolve_expr(args[0], doc)
                return val if val is not None else args[1]
        return 0

    def aggregate(self, pipeline: list[dict]) -> LocalCursor:
        docs = copy.deepcopy(self._docs)
        for stage in pipeline:
            if "$match" in stage:
                docs = [d for d in docs if self._matches(d, stage["$match"])]
            elif "$skip" in stage:
                docs = docs[stage["$skip"]:]
            elif "$limit" in stage:
                docs = docs[:stage["$limit"]]
            elif "$count" in stage:
                count_field = stage["$count"]
                docs = [{count_field: len(docs)}]
            elif "$sort" in stage:
                sort_spec = stage["$sort"]
                if sort_spec:
                    # Support multi-key sort (last key wins in stable sort)
                    for key, direction in reversed(list(sort_spec.items())):
                        docs.sort(key=lambda x, k=key: (x.get(k) is None, x.get(k) or ""), reverse=(direction == -1))
            elif "$group" in stage:
                group_spec = stage["$group"]
                group_id_spec = group_spec.get("_id")
                groups: dict = {}
                group_key_map: dict = {}  # hashable key -> original _id value

                for d in docs:
                    # Compute the group key
                    if group_id_spec is None:
                        g_key = None
                        g_key_hash = None
                    elif isinstance(group_id_spec, str) and group_id_spec.startswith("$"):
                        g_key = self._get_nested(d, group_id_spec[1:])
                        g_key_hash = g_key
                    elif isinstance(group_id_spec, dict):
                        # e.g. {year: {$year: "$run_at"}, month: {$month: "$run_at"}}
                        g_key = {}
                        key_vals = []
                        for k, spec_val in group_id_spec.items():
                            if isinstance(spec_val, dict) and "$year" in spec_val:
                                f = spec_val["$year"][1:]
                                val = self._get_nested(d, f)
                                year = val.year if hasattr(val, "year") else (int(str(val)[:4]) if val and str(val)[:4].isdigit() else 2026)
                                g_key[k] = year
                                key_vals.append(year)
                            elif isinstance(spec_val, dict) and "$month" in spec_val:
                                f = spec_val["$month"][1:]
                                val = self._get_nested(d, f)
                                month = val.month if hasattr(val, "month") else 1
                                g_key[k] = month
                                key_vals.append(month)
                            else:
                                raw = self._resolve_expr(spec_val, d)
                                g_key[k] = raw
                                key_vals.append(raw)
                        g_key_hash = tuple(key_vals)
                    else:
                        g_key = group_id_spec
                        g_key_hash = group_id_spec

                    if g_key_hash not in groups:
                        groups[g_key_hash] = []
                        group_key_map[g_key_hash] = g_key
                    groups[g_key_hash].append(d)

                new_docs = []
                for g_key_hash, group_items in groups.items():
                    out_doc = {"_id": group_key_map[g_key_hash]}
                    for acc_field, acc_spec in group_spec.items():
                        if acc_field == "_id":
                            continue
                        if not isinstance(acc_spec, dict):
                            continue
                        if "$sum" in acc_spec:
                            s = acc_spec["$sum"]
                            if isinstance(s, (int, float)):
                                out_doc[acc_field] = len(group_items) * s
                            elif isinstance(s, str) and s.startswith("$"):
                                out_doc[acc_field] = sum(float(self._get_nested(x, s[1:]) or 0) for x in group_items)
                            elif isinstance(s, dict):
                                # e.g. {$ifNull: ["$summary.fraud", 0]} or {$cond: [...]}
                                out_doc[acc_field] = sum(float(self._eval_agg_expr(s, x)) for x in group_items)
                            else:
                                out_doc[acc_field] = 0
                        elif "$first" in acc_spec:
                            f_expr = acc_spec["$first"]
                            out_doc[acc_field] = self._get_nested(group_items[0], f_expr[1:]) if group_items else None
                        elif "$max" in acc_spec:
                            f_expr = acc_spec["$max"]
                            if isinstance(f_expr, str) and f_expr.startswith("$"):
                                vals = [self._get_nested(x, f_expr[1:]) for x in group_items]
                                vals = [v for v in vals if v is not None]
                                out_doc[acc_field] = max(vals) if vals else 0
                        elif "$addToSet" in acc_spec:
                            f_expr = acc_spec["$addToSet"]
                            if isinstance(f_expr, str) and f_expr.startswith("$"):
                                seen = []
                                for x in group_items:
                                    val = self._get_nested(x, f_expr[1:])
                                    if val is not None and val not in seen:
                                        seen.append(val)
                                out_doc[acc_field] = seen
                    new_docs.append(out_doc)
                docs = new_docs

        return LocalCursor(docs)


# Local Async Collections for non-login datasets
recon_results_col = LocalAsyncCollection("reconciliation_results")
recon_runs_col = LocalAsyncCollection("reconciliation_runs")
uploads_col = LocalAsyncCollection("uploads")


class HybridAuthCollection:
    """Wrapper that tries MongoDB with a 5s timeout, falling back seamlessly to LocalAsyncCollection if MongoDB fails or times out."""
    def __init__(self, mongo_coll, name: str):
        self._mongo = mongo_coll
        self._local = LocalAsyncCollection(name)

    async def find_one(self, query: dict = None, projection: dict = None, sort=None):
        try:
            return await asyncio.wait_for(self._mongo.find_one(query, projection, sort=sort), timeout=5.0)
        except Exception as e:
            print(f"[HybridAuthCollection] Mongo operation failed for find_one ({self._local.collection_name}): {e}. Falling back to local store.")
            return await self._local.find_one(query, projection, sort=sort)

    async def insert_one(self, document: dict):
        try:
            res = await asyncio.wait_for(self._mongo.insert_one(document), timeout=5.0)
            try:
                await self._local.insert_one(document)
            except Exception:
                pass
            return res
        except Exception as e:
            print(f"[HybridAuthCollection] Mongo operation failed for insert_one ({self._local.collection_name}): {e}. Falling back to local store.")
            return await self._local.insert_one(document)

    async def update_one(self, query: dict, update: dict, upsert: bool = False):
        try:
            res = await asyncio.wait_for(self._mongo.update_one(query, update, upsert=upsert), timeout=5.0)
            try:
                await self._local.update_one(query, update, upsert=upsert)
            except Exception:
                pass
            return res
        except Exception as e:
            print(f"[HybridAuthCollection] Mongo operation failed for update_one ({self._local.collection_name}): {e}. Falling back to local store.")
            return await self._local.update_one(query, update, upsert=upsert)

    async def delete_one(self, query: dict):
        try:
            res = await asyncio.wait_for(self._mongo.delete_one(query), timeout=5.0)
            try:
                await self._local.delete_one(query)
            except Exception:
                pass
            return res
        except Exception as e:
            print(f"[HybridAuthCollection] Mongo operation failed for delete_one ({self._local.collection_name}): {e}. Falling back to local store.")
            return await self._local.delete_one(query)

    async def delete_many(self, query: dict):
        try:
            res = await asyncio.wait_for(self._mongo.delete_many(query), timeout=5.0)
            try:
                await self._local.delete_many(query)
            except Exception:
                pass
            return res
        except Exception as e:
            print(f"[HybridAuthCollection] Mongo operation failed for delete_many ({self._local.collection_name}): {e}. Falling back to local store.")
            return await self._local.delete_many(query)

    async def count_documents(self, query: dict):
        try:
            return await asyncio.wait_for(self._mongo.count_documents(query), timeout=5.0)
        except Exception as e:
            print(f"[HybridAuthCollection] Mongo operation failed for count_documents ({self._local.collection_name}): {e}. Falling back to local store.")
            return await self._local.count_documents(query)


users_collection = HybridAuthCollection(raw_users_collection, "users")
otps_collection = HybridAuthCollection(raw_otps_collection, "otps")


