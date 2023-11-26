const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const FilesTemplateSchema = new mongoose.Schema(
  {
    fileTemplate: {
      type: String,
      required: [true, "Avatar is required"],
    },
    description: {
      type: String,
      trim: true,
      required: [true, "Description is required"],
    },
    status :{
      type: String,
      default: "Active"
    },
    user: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FilesTemplate", FilesTemplateSchema);
