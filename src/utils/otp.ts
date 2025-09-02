export const generateNumberOtp = ():number => {
    return Math.floor(Math.random() * (900000 - 100000 + 1)+100000)
};
