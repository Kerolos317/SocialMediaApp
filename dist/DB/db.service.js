"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOne = exports.findOneAndUpdate = exports.updateOne = exports.create = exports.findById = exports.findOne = void 0;
const findOne = async ({ model, filter = {}, select = "", }) => {
    return await model.findOne(filter).select(select);
};
exports.findOne = findOne;
const findById = async ({ model, id, select = "", }) => {
    return await model.findById(id).select(select);
};
exports.findById = findById;
const create = async ({ model, data = [{}], option = {}, }) => {
    return await model.create(data, option);
};
exports.create = create;
const updateOne = async ({ model, filter = {}, data = {}, option = { runValidators: true }, }) => {
    return await model.updateOne(filter, data, option);
};
exports.updateOne = updateOne;
const findOneAndUpdate = async ({ model, filter = {}, data = {}, select = "", option = { runValidators: true, new: true }, }) => {
    return await model
        .findOneAndUpdate(filter, { ...data, $inc: { __v: 1 } }, option)
        .select(select);
};
exports.findOneAndUpdate = findOneAndUpdate;
const deleteOne = async ({ model, filter = {}, }) => {
    return await model.deleteOne(filter);
};
exports.deleteOne = deleteOne;
