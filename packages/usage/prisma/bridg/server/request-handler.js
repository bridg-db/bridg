"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRequest = void 0;
var handleRequest = function (requestBody, config) { return __awaiter(void 0, void 0, void 0, function () {
    var model, func, args, db, uid, rules, method, updateArgs, updateData, err_1, data, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                model = requestBody.model, func = requestBody.func, args = requestBody.args;
                if (!models.includes(model))
                    return [2 /*return*/, { status: 401, data: { error: 'Unauthorized', model: model } }];
                args = args || {};
                db = config.db, uid = config.uid, rules = config.rules;
                method = FUNC_METHOD_MAP[func];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                if (!(func === 'upsert')) return [3 /*break*/, 4];
                updateArgs = {
                    where: args.where,
                    data: args.update,
                };
                return [4 /*yield*/, applyRulesWheres(updateArgs, { model: model, method: 'update' }, { uid: uid, rules: rules })];
            case 2:
                _b.sent();
                return [4 /*yield*/, db[model].update(updateArgs).catch(function () { })];
            case 3:
                updateData = _b.sent();
                if (updateData) {
                    return [2 /*return*/, { status: 200, data: updateData }];
                }
                else {
                    // no data updated, continue as a .create query
                    func = 'create';
                    args = { data: args.create };
                    method = 'create';
                }
                _b.label = 4;
            case 4: return [4 /*yield*/, applyRulesWheres(args, { model: model, method: method }, { uid: uid, rules: rules })];
            case 5:
                _b.sent();
                return [3 /*break*/, 7];
            case 6:
                err_1 = _b.sent();
                if ((err_1 === null || err_1 === void 0 ? void 0 : err_1.message) === 'Unauthorized') {
                    return [2 /*return*/, { status: 401, data: { error: "Unauthorized Bridg query on model: ".concat((_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.data) === null || _a === void 0 ? void 0 : _a.model) } }];
                }
                else {
                    return [2 /*return*/, { status: 400, data: { error: "Error executing Bridg query: ".concat(err_1 === null || err_1 === void 0 ? void 0 : err_1.message) } }];
                }
                return [3 /*break*/, 7];
            case 7:
                _b.trys.push([7, 9, , 10]);
                return [4 /*yield*/, db[model][func](args)];
            case 8:
                // @ts-ignore
                data = _b.sent();
                return [3 /*break*/, 10];
            case 9:
                error_1 = _b.sent();
                console.error(error_1);
                return [2 /*return*/, { status: 500, message: 'Internal server error.' }];
            case 10: return [2 /*return*/, { status: 200, data: data }];
        }
    });
}); };
exports.handleRequest = handleRequest;
var applyRulesWheres = function (args, options, context) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, rules, model, _a, acceptsWheres, method, modelMethodValidator, modelDefaultValidator, queryValidator, ruleWhereOrBool, _b, rulesWhere, modelRelations, relationNames_1, relationsInDataProp;
    var _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                uid = context.uid, rules = context.rules;
                model = options.model, _a = options.acceptsWheres, acceptsWheres = _a === void 0 ? true : _a, method = options.method;
                modelMethodValidator = (_c = rules[model]) === null || _c === void 0 ? void 0 : _c[method];
                modelDefaultValidator = (_d = rules[model]) === null || _d === void 0 ? void 0 : _d.default;
                queryValidator = (_e = modelMethodValidator !== null && modelMethodValidator !== void 0 ? modelMethodValidator : modelDefaultValidator) !== null && _e !== void 0 ? _e : !!rules.default;
                if (!(typeof queryValidator === 'function')) return [3 /*break*/, 2];
                return [4 /*yield*/, queryValidator(uid, args === null || args === void 0 ? void 0 : args.data)];
            case 1:
                _b = _f.sent();
                return [3 /*break*/, 3];
            case 2:
                _b = queryValidator;
                _f.label = 3;
            case 3:
                ruleWhereOrBool = _b;
                if (ruleWhereOrBool === false)
                    throw { message: 'Unauthorized', data: { model: model } };
                if (typeof ruleWhereOrBool === 'object' && !acceptsWheres) {
                    console.error("Rule error on nested model: \"".concat(model, "\".  Cannot apply prisma where clauses to N-1 or 1-1 required relationships, only 1-N.\nMore info: https://github.com/prisma/prisma/issues/15837#issuecomment-1290404982\n\nTo fix this until issue is resolved: Change \"").concat(model, "\" db rules to not rely on where clauses, OR for N-1 relationships, invert the include so the \"").concat(model, "\" model is including the many table. (N-1 => 1-N)"));
                    throw { message: 'Unauthorized', data: { model: model } };
                    // don't accept wheres for create
                }
                else if (method !== 'create') {
                    if (ruleWhereOrBool === true && !acceptsWheres) {
                        delete args.where;
                    }
                    else {
                        rulesWhere = ruleWhereOrBool === true ? {} : ruleWhereOrBool;
                        // Note: AND: [args.where, rulesWhere] breaks on findUnique, update, delete
                        args.where = __assign(__assign({}, ((args === null || args === void 0 ? void 0 : args.where) || {})), { AND: [rulesWhere] });
                    }
                }
                modelRelations = MODEL_RELATION_MAP[model];
                if (!args.include) return [3 /*break*/, 5];
                return [4 /*yield*/, Promise.all(Object.keys(args.include).map(function (relationName) {
                        var m = modelRelations[relationName];
                        var relationInclude = args.include[relationName];
                        if (relationInclude === false)
                            return true;
                        else if (relationInclude === true) {
                            args.include[relationName] = { where: {} };
                            return applyRulesWheres(args.include[relationName], __assign(__assign({}, m), { method: 'find' }), context);
                        }
                        else {
                            return applyRulesWheres(relationInclude, __assign(__assign({}, m), { method: 'find' }), context);
                        }
                    }))];
            case 4:
                _f.sent();
                _f.label = 5;
            case 5:
                if (!(args.data && ['create', 'update'].includes(method))) return [3 /*break*/, 7];
                relationNames_1 = Object.keys(modelRelations);
                relationsInDataProp = Object.keys(args.data).filter(function (key) { return relationNames_1.includes(key); });
                return [4 /*yield*/, Promise.all(relationsInDataProp
                        .map(function (relationName) {
                        // mutationMethod: create | connect | connectOrCreate | delete | deleteMany | disconnect
                        // | set | update | updateMany | upsert | push (mongo only)
                        return Object.keys(args.data[relationName]).map(function (mutationMethod) { return __awaiter(void 0, void 0, void 0, function () {
                            var method, mutationMethodValue, argType, nestedArgs, computedArgs;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        // disabled: connectOrCreate, set / disconnect (no wheres), upsert
                                        if (!['connect', 'create', 'delete', 'deleteMany', 'update', 'updateMany'].includes(mutationMethod)) {
                                            console.error("Nested ".concat(mutationMethod, " not yet supported in Bridg. Could violate database rules without further development."));
                                            throw Error();
                                        }
                                        method = mutationMethod === 'connect' ? 'update' : FUNC_METHOD_MAP[mutationMethod];
                                        if (!method)
                                            throw Error();
                                        mutationMethodValue = args.data[relationName][mutationMethod];
                                        argType = ['update', 'updateMany'].includes(mutationMethod)
                                            ? 'WHERE_AND_DATA'
                                            : ['create', 'connect'].includes(mutationMethod)
                                                ? 'DATA'
                                                : ['delete', 'deleteMany'].includes(mutationMethod)
                                                    ? 'WHERE'
                                                    : null;
                                        if (!argType)
                                            throw Error('invalid argType');
                                        nestedArgs = {
                                            WHERE_AND_DATA: mutationMethodValue,
                                            WHERE: { where: mutationMethodValue },
                                            DATA: { data: mutationMethodValue },
                                        }[argType];
                                        return [4 /*yield*/, applyRulesWheres(nestedArgs, __assign(__assign({}, modelRelations[relationName]), { method: method }), context)];
                                    case 1:
                                        _a.sent();
                                        computedArgs = {
                                            WHERE_AND_DATA: nestedArgs,
                                            WHERE: nestedArgs.where,
                                            DATA: nestedArgs.data,
                                        }[argType];
                                        args.data[relationName][mutationMethod] = computedArgs;
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                    })
                        .flat())];
            case 6:
                _f.sent();
                _f.label = 7;
            case 7: return [2 /*return*/];
        }
    });
}); };
var funcOptions = [
    'aggregate',
    'count',
    'create',
    'delete',
    'deleteMany',
    'findFirst',
    'findFirstOrThrow',
    'findMany',
    'findUnique',
    'findUniqueOrThrow',
    'groupBy',
    'update',
    'updateMany',
    'upsert',
];
var FUNC_METHOD_MAP = {
    aggregate: 'find',
    count: 'find',
    create: 'create',
    delete: 'delete',
    deleteMany: 'delete',
    findFirst: 'find',
    findFirstOrThrow: 'find',
    findMany: 'find',
    findUnique: 'find',
    findUniqueOrThrow: 'find',
    groupBy: 'find',
    update: 'update',
    updateMany: 'update',
    upsert: 'update',
};
var MODEL_RELATION_MAP = {
    "user": {
        "blogs": {
            "acceptsWheres": true,
            "model": "blog"
        }
    },
    "blog": {
        "user": {
            "acceptsWheres": true,
            "model": "user"
        },
        "comments": {
            "acceptsWheres": true,
            "model": "comment"
        }
    },
    "comment": {
        "blog": {
            "acceptsWheres": true,
            "model": "blog"
        }
    }
};
var models = ['user', 'blog', 'comment'];
