"use strict";
// ============================================
// MIGRATE PHONE NUMBERS - Import from Orders
// ============================================
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongodb_1 = __importDefault(require("../src/lib/mongodb"));
var Order_1 = __importDefault(require("../src/lib/models/Order"));
var PhoneNumber_1 = __importDefault(require("../src/lib/models/PhoneNumber"));
// Phone numbers to exclude from migration
var EXCLUDED_PHONES = [
    '81515263851',
    '085859461424',
    '085731854878'
];
function migratePhoneNumbers() {
    return __awaiter(this, void 0, void 0, function () {
        var phones, validPhones, phoneDocuments, insertedCount, result, err_1, finalCount, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 9, , 10]);
                    console.log('🔄 Starting phone numbers migration...');
                    return [4 /*yield*/, (0, mongodb_1.default)()];
                case 1:
                    _b.sent();
                    console.log('✅ Connected to database');
                    return [4 /*yield*/, Order_1.default.distinct('phone', {
                            'verification.status': 'approved',
                            deleted: { $ne: true }
                        })];
                case 2:
                    phones = _b.sent();
                    console.log("\uD83D\uDCCA Found ".concat(phones.length, " total phone numbers in orders"));
                    validPhones = phones.filter(function (phone) {
                        if (!phone || !phone.trim())
                            return false;
                        // Check if phone matches any excluded number (with or without leading 0)
                        var cleanPhone = phone.replace(/^0/, ''); // Remove leading 0 for comparison
                        var isExcluded = EXCLUDED_PHONES.some(function (excluded) {
                            var cleanExcluded = excluded.replace(/^0/, '');
                            return cleanPhone === cleanExcluded || phone === excluded;
                        });
                        return !isExcluded;
                    });
                    console.log("\u2705 Filtered to ".concat(validPhones.length, " valid phone numbers (excluded ").concat(phones.length - validPhones.length, ")"));
                    // Clear existing phone numbers collection
                    return [4 /*yield*/, PhoneNumber_1.default.deleteMany({})];
                case 3:
                    // Clear existing phone numbers collection
                    _b.sent();
                    console.log('🗑️  Cleared existing phone numbers');
                    phoneDocuments = validPhones.map(function (phone) { return ({ phone: phone }); });
                    insertedCount = 0;
                    if (!(phoneDocuments.length > 0)) return [3 /*break*/, 7];
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, PhoneNumber_1.default.insertMany(phoneDocuments, {
                            ordered: false,
                        })];
                case 5:
                    result = _b.sent();
                    insertedCount = Array.isArray(result) ? result.length : 0;
                    console.log("\u2705 Inserted ".concat(insertedCount, " phone numbers into database"));
                    return [3 /*break*/, 7];
                case 6:
                    err_1 = _b.sent();
                    // Handle duplicate key errors gracefully
                    if (err_1.code === 11000) {
                        insertedCount = phoneDocuments.length - (((_a = err_1.writeErrors) === null || _a === void 0 ? void 0 : _a.length) || 0);
                        console.log("\u26A0\uFE0F  Some duplicate phones were skipped, inserted ".concat(insertedCount, " unique numbers"));
                    }
                    else {
                        throw err_1;
                    }
                    return [3 /*break*/, 7];
                case 7: return [4 /*yield*/, PhoneNumber_1.default.countDocuments()];
                case 8:
                    finalCount = _b.sent();
                    console.log("\uD83D\uDCCA Final phone numbers count: ".concat(finalCount));
                    console.log('\n✨ Migration completed successfully!');
                    process.exit(0);
                    return [3 /*break*/, 10];
                case 9:
                    error_1 = _b.sent();
                    console.error('❌ Migration failed:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
// Run migration
migratePhoneNumbers();
