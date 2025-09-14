import { DatabaseRepository } from "./database.repository";
import { IPost as TDocment } from "../models/Post.model";
import { Model } from "mongoose";

export class PostRepository extends DatabaseRepository<TDocment> {
    constructor(protected override readonly model: Model<TDocment>) {
        super(model);
    }
}
