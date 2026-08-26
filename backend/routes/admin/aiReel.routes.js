const express=require("express");
const router=express.Router();
const {isAdmin}=require("../../middlewares/admin.middleware");
const upload=require("../../middlewares/upload.middleware");
const {validateAIReel}=require("../../validators/aiReel.validator");
const {
    createAIReel,
    getAllAIReels,
    getAIReelById,
    updateAIReel,
    deleteAIReel
}=require("../../controllers/admin/aiReel.controller");
const aiReelFiles=upload.fields([
    {name:"video",maxCount:1},
    {name:"thumbnail",maxCount:1}
]);
router.use(isAdmin);
router.post("/",aiReelFiles,validateAIReel,createAIReel);
router.get("/",getAllAIReels);
router.get("/:id",getAIReelById);
router.patch("/:id",aiReelFiles,validateAIReel,updateAIReel);
router.delete("/:id",deleteAIReel);

module.exports=router;