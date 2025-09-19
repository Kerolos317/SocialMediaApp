"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseRepository = void 0;
class DatabaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async findOne({ filter, select, options, }) {
        const doc = this.model.findOne(filter).select(select || "");
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    async find({ filter, select, options, }) {
        const doc = this.model.find(filter || {}).select(select || "");
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.limit) {
            doc.limit(options.limit);
        }
        if (options?.skip) {
            doc.skip(options.skip);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    async paginate({ filter = {}, select, options = {}, page = "all", size = 5, }) {
        let countDocuments = undefined;
        let pages = undefined;
        console.log(page);
        if (page !== "all") {
            page = Math.floor(page < 1 ? 1 : page);
            options.limit = Math.floor(size < 1 ? 5 : size);
            options.skip = (page - 1) * options.limit;
            countDocuments = await this.model.countDocuments(filter);
            pages = Math.ceil(countDocuments / options.limit);
        }
        const result = await this.find({
            filter,
            options,
            select,
        });
        return {
            pages,
            countDocuments,
            size: options.limit,
            currentPage: page,
            result,
        };
    }
    async create({ data, options, }) {
        return await this.model.create(data, options);
    }
    async updateOne({ filter, update, options, }) {
        if (Array.isArray(update)) {
            update.push({ $set: { __v: { $add: ["$__v", 1] } } });
            return await this.model.updateOne(filter || {}, update, options);
        }
        return await this.model.updateOne(filter || {}, { ...update, $inc: { __v: 1 } }, options);
    }
    async deleteOne({ filter, }) {
        return await this.model.deleteOne(filter);
    }
    async findByIdAndUpdate({ id, update, options = { new: true }, }) {
        return await this.model.findByIdAndUpdate(id, { ...update, $inc: { __v: 1 } }, options);
    }
    async findOneAndUpdate({ filter, update, options = { new: true }, }) {
        return await this.model.findOneAndUpdate(filter, { ...update, $inc: { __v: 1 } }, options);
    }
}
exports.DatabaseRepository = DatabaseRepository;
