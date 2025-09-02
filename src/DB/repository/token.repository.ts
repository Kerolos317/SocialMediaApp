import { DatabaseRepository } from "./database.repository";
import { IToken as TDocment } from "../models/Token.model";
import { Model } from "mongoose";

export class TokenRepository extends DatabaseRepository<TDocment> {
    constructor(protected override readonly model: Model<TDocment>) {
        super(model);
    }
}
