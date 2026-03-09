const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dest = "uploads/experiences";

    if (file.fieldname === "vrImage") {
      dest = "uploads/vr360";
    }

    if (file.fieldname === "profileImage") {
      dest = "uploads/profile-images";
    }

    ensureDir(dest);
    cb(null, dest);
  },

  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, unique + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|webp/;
  const ext = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedImageTypes.test(file.mimetype);

  if (ext && mime) {
    return cb(null, true);
  }

  return cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = upload;