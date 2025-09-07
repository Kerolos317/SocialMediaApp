import { RoleEnum } from "../../DB/models/User.model";



export const endpoint ={
  profile:[RoleEnum.User , RoleEnum.Admin],
  hardDelete:[ RoleEnum.Admin]
}