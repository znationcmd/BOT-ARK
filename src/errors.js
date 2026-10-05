class AppError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status}}
module.exports={AppError,fail:(code,status)=>{throw new AppError(code,status)}};
