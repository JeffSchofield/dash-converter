#!/usr/bin/env node
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
exports.__esModule = true;
// @ts-ignore
var dist_1 = require("../dist");
var path_1 = require("path");
var fs_extra_1 = require("fs-extra");
var CWD = process.cwd();
var config_path = (0, path_1.join)(CWD, 'config.json');
var input_dir = (0, path_1.join)(CWD, 'input');
var output_dir = (0, path_1.join)(CWD, 'output');
var default_config_file = {
    "audio_formats": [
        { "name": "192", "args": { "b:a": "192k", "ar": 48000, "ac": 2 } },
        { "name": "128", "args": { "b:a": "128k", "ar": 48000, "ac": 2 } }
    ],
    "video_formats": [
        {
            "name": "5800",
            "args": {
                "crf": 22,
                "b:v": "5800k",
                "maxrate": "5800k",
                "bufsize": "12000k"
            }
        },
        {
            "name": "4300",
            "args": {
                "b:v": "4300k",
                "maxrate": "4300k",
                "bufsize": "8600k"
            }
        },
        {
            "name": "3000",
            "args": {
                "b:v": "3000k",
                "maxrate": "3000k",
                "bufsize": "6000k",
                "vf": "scale=-2:720"
            }
        },
        {
            "name": "2350",
            "args": {
                "b:v": "2350k",
                "maxrate": "2350k",
                "bufsize": "4700k",
                "vf": "scale=-2:720"
            }
        },
        {
            "name": "1750",
            "args": {
                "b:v": "1750k",
                "maxrate": "1750k",
                "bufsize": "3500k",
                "vf": "scale=-2:480"
            }
        },
        {
            "name": "750",
            "args": {
                "b:v": "750k",
                "maxrate": "750k",
                "bufsize": "1500k",
                "vf": "scale=-2:384"
            }
        },
        {
            "name": "560",
            "args": {
                "b:v": "560k",
                "maxrate": "560k",
                "bufsize": "1120k",
                "vf": "scale=-2:384"
            }
        },
        {
            "name": "375",
            "args": {
                "b:v": "375k",
                "maxrate": "375k",
                "bufsize": "750k",
                "vf": "scale=-2:288"
            }
        },
        {
            "name": "235",
            "args": {
                "b:v": "235k",
                "maxrate": "235k",
                "bufsize": "470k",
                "vf": "scale=-2:240"
            }
        }
    ]
};
function init() {
    return __awaiter(this, void 0, void 0, function () {
        var e_1, config, e_2, dash_converter, files, conversions, _i, files_1, file, file_path;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Initializing DASH converter...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, fs_extra_1.stat)(input_dir)]; // Check if the input directory exists, error if it doesn't
                case 2:
                    _a.sent(); // Check if the input directory exists, error if it doesn't
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    throw new Error("Input directory '" + input_dir + "' does not exist!");
                case 4: return [4 /*yield*/, (0, fs_extra_1.ensureDir)(output_dir)]; // Make sure an output directory exists
                case 5:
                    _a.sent(); // Make sure an output directory exists
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 7, , 9]);
                    config = require(config_path);
                    if (!config)
                        throw new Error('Broken config');
                    return [3 /*break*/, 9];
                case 7:
                    e_2 = _a.sent();
                    config = __assign({}, default_config_file);
                    return [4 /*yield*/, (0, fs_extra_1.writeFile)(config_path, JSON.stringify(config, undefined, '\t'))];
                case 8:
                    _a.sent();
                    return [3 /*break*/, 9];
                case 9:
                    dash_converter = new dist_1.DASHConverter(config);
                    if (process.argv.includes('-hwaccel'))
                        dash_converter.hwaccel = true;
                    return [4 /*yield*/, (0, fs_extra_1.readdir)(input_dir)];
                case 10:
                    files = _a.sent();
                    conversions = [];
                    for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                        file = files_1[_i];
                        file_path = (0, path_1.join)(input_dir, file);
                        conversions.push(dash_converter.convert(file_path, output_dir));
                    }
                    return [4 /*yield*/, Promise.allSettled(conversions)];
                case 11:
                    _a.sent();
                    console.log('DASH Converter finished.');
                    return [2 /*return*/];
            }
        });
    });
}
init()["catch"](function (e) { return console.error("DASH Converter Failed: " + e); });
