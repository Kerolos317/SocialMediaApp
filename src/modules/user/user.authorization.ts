import { RoleEnum } from "../../DB/models/User.model";



export const endpoint ={
  profile:[RoleEnum.User , RoleEnum.Admin],
  hardDelete:[ RoleEnum.Admin],
  dashboard:[RoleEnum.Admin , RoleEnum.superAdmin]
}