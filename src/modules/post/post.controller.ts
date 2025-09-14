import { Router } from "express";
import { authentication } from "../../middleware/authentication.middleware";
import postService from "./post.service";

const router = Router();

router.post("/create-post" , authentication() , postService.createPost)
export default router;
