import {
    CreateOptions,
    DeleteResult,
    FlattenMaps,
    HydratedDocument,
    Model,
    MongooseUpdateQueryOptions,
    PopulateOptions,
    ProjectionType,
    QueryOptions,
    RootFilterQuery,
    Types,
    UpdateQuery,
    UpdateWriteOpResult,
} from "mongoose";

export type Lean<T> = HydratedDocument<FlattenMaps<T>>;

export abstract class DatabaseRepository<TDocument> {
    constructor(protected readonly model: Model<TDocument>) {}

    async findOne({
        filter,
        select,
        options,
    }: {
        filter?: RootFilterQuery<TDocument>;
        select?: ProjectionType<TDocument> | null;
        options?: QueryOptions<TDocument> | null;
    }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
        const doc = this.model.findOne(filter).select(select || "");
        if (options?.populate) {
            doc.populate(options.populate as PopulateOptions[]);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }

    async find({
        filter,
        select,
        options,
    }: {
        filter?: RootFilterQuery<TDocument>;
        select?: ProjectionType<TDocument> | undefined;
        options?: QueryOptions<TDocument> | undefined;
    }): Promise<HydratedDocument<TDocument>[]> {
        const doc = this.model.find(filter || {}).select(select || "");
        if (options?.populate) {
            doc.populate(options.populate as PopulateOptions[]);
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

    async paginate({
        filter = {},
        select,
        options = {},
        page = "all",
        size = 5,
    }: {
        filter?: RootFilterQuery<TDocument>;
        select?: ProjectionType<TDocument> | undefined;
        options?: QueryOptions<TDocument> | undefined;
        page?: number | "all";
        size?: number | undefined;
    }): Promise<HydratedDocument<TDocument>[] | [] | Lean<TDocument> | any> {
        let countDocuments: number | undefined = undefined;
        let pages: number | undefined = undefined;
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

    async create({
        data,
        options,
    }: {
        data: Partial<TDocument>[];
        options?: CreateOptions | undefined;
    }): Promise<HydratedDocument<TDocument>[] | undefined> {
        return await this.model.create(data, options);
    }

    async updateOne({
        filter,
        update,
        options,
    }: {
        filter: RootFilterQuery<TDocument>;
        update: UpdateQuery<TDocument>;
        options?: MongooseUpdateQueryOptions<TDocument> | null;
    }): Promise<UpdateWriteOpResult> {
        if (Array.isArray(update)) {
            update.push({ $set: { __v: { $add: ["$__v", 1] } } });
            return await this.model.updateOne(filter || {}, update, options);
        }
        return await this.model.updateOne(
            filter || {},
            { ...update, $inc: { __v: 1 } },
            options
        );
    }

    async deleteOne({
        filter,
    }: {
        filter: RootFilterQuery<TDocument>;
    }): Promise<DeleteResult> {
        return await this.model.deleteOne(filter);
    }

    async findByIdAndUpdate({
        id,
        update,
        options = { new: true },
    }: {
        id: Types.ObjectId;
        update: UpdateQuery<TDocument>;
        options?: QueryOptions<TDocument> | null;
    }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
        return await this.model.findByIdAndUpdate(
            id,
            { ...update, $inc: { __v: 1 } },
            options
        );
    }
    async findOneAndUpdate({
        filter,
        update,
        options = { new: true },
    }: {
        filter: RootFilterQuery<TDocument>;
        update: UpdateQuery<TDocument>;
        options?: QueryOptions<TDocument> | null;
    }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
        return await this.model.findOneAndUpdate(
            filter,
            { ...update, $inc: { __v: 1 } },
            options
        );
    }
}
