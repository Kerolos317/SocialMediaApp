import { DatabaseRepository } from "./database.repository";
import { IComment as TDocment } from "../models/Comment.model";
import { Model } from "mongoose";

export class CommentRepository extends DatabaseRepository<TDocment> {
    constructor(protected override readonly model: Model<TDocment>) {
        super(model);
    }
}
