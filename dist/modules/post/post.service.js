"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const success_response_1 = require("../../utils/response/success.response");
class PostService {
    constructor() { }
    createPost = async (req, res) => {
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
}
exports.default = new PostService();
