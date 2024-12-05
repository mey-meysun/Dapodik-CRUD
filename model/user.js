const mongoose = require("mongoose");

const User = mongoose.model("User", {
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});


// // Menambah 1 data
// const admin = new User({
//   username: "admin",
//   password: "admin",
// });

// // Simpan ke Collection
// admin.save();

module.exports = User;
