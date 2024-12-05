const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const methodOverride = require("method-override");

const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");

const { body, validationResult, check } = require("express-validator");

require("./utils/db");
const Siswa = require("./model/siswa");
const User = require("./model/user");

const app = express();
const port = 3000;

// set up method override
app.use(methodOverride("_method"));

// Set Up Ejs
app.set("view engine", "ejs");
app.use(expressLayouts);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// konfigurasi flash
app.use(cookieParser("secret"));
app.use(
  session({
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 hari
    secret: "secret",
    resave: true,
    saveUninitialized: false,
  })
);
app.use(flash());

app.use((req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user.username;
  } else {
    res.locals.user = null; 
  }
  next();
});

const authenticateUser = (req, res, next) => {
  if (req.session && req.session.user) {
    next(); // Jika sesi ada, lanjutkan ke handler berikutnya
  } else {
    res.redirect("/login"); // Jika tidak login, arahkan ke halaman login
  }
};

// Halaman Log-in
app.get("/login", (req, res) => {
  res.render("login", {
    layout: "./layouts/login.ejs",
    title: "Log in | Dapodik",
    success: null,
    error: req.flash("error"),
    succesLogout: req.flash("succesLogout")
  });
});

// Proses Log in
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      req.flash("error", "Username atau password salah");
      return res.redirect("/login");
    }

    req.session.user = { id: user._id, username: user.username };
    req.flash("success", "Selamat Datang!");
    res.redirect("/");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Terjadi kesalahan server");
  }
});

// Halaman Home
app.get("/", authenticateUser, (req, res) => {
  res.render("index", {
    layout: "./layouts/main.ejs",
    title: "Home | Dapodik",
    success: req.flash("success"),
  });
});

// Halaman About
app.get("/about", authenticateUser, (req, res) => {
  res.render("about", {
    layout: "./layouts/main.ejs",
    title: "About | Dapodik",
  });
});

// Halaman Siswa
app.get("/siswa", authenticateUser, async (req, res) => {
  const siswas = await Siswa.find();

  res.render("list-siswa", {
    title: "Data Siswa | Dapodik",
    layout: "./layouts/main.ejs",
    siswas,
    msg: req.flash("msg"),
  });
});


// halaman form tambah data siswa
app.get("/siswa/add", authenticateUser, (req, res) => {
  res.render("add-siswa", {
    title: "Form Tambah Data Siswa | Dapodik",
    layout: "./layouts/main.ejs",
  });
});

// proses tambah data siswa
app.post(
  "/siswa",
  [
    check("nisn", "NISN tidak valid!").isNumeric(),
    body("nisn").custom(async (value) => {
      const panjang = await value.length;
      if (panjang < 10) {
        throw new Error("NISN tidak boleh kurang dari 10 digit!");
      }
      return true;
    }),
    body("nisn").custom(async (value) => {
      const duplikat = await Siswa.findOne({ nisn: value });
      if (duplikat) {
        throw new Error("NISN sudah digunakan!");
      }
      return true;
    }),
    check("nik", "NIK tidak valid!").isNumeric(),
    body("nik").custom(async (value) => {
      const panjang = await value.length;
      if (panjang < 16) {
        throw new Error("NIK tidak boleh kurang dari 16 digit!");
      }
      return true;
    }),
    body("nik").custom(async (value) => {
      const duplikat = await Siswa.findOne({ nik: value });
      if (duplikat) {
        throw new Error("NIK sudah digunakan!");
      }
      return true;
    }),
    check("nokk", "No. KK tidak valid!").isNumeric(),
    body("nokk").custom(async (value, {req}) => {
      const panjang = await value.length;
      if (panjang < 10) {
        throw new Error("No. KK tidak boleh kurang dari 16 digit!");
      }
      return true;
    }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render("add-siswa", {
        title: "Form Tambah Data Siswa",
        layout: "./layouts/main.ejs",
        errors: errors.array(),
      });
    } else {
      // Format tanggal menjadi yyyy-mm-dd sebelum disimpan
      if (req.body.tgl_masuk) {
        req.body.tgl_masuk = new Date(req.body.tgl_masuk)
          .toISOString()
          .split("T")[0];
      }

      Siswa.insertMany(req.body, (err, result) => {
        // mengirimkan flash message
        req.flash("msg", `Data siswa ${req.body.nama} berhasil di tambahkan!`);
        res.redirect("/siswa");
      });
    }
  }
);

// proses delete siswa
app.delete("/siswa", (req, res) => {
  Siswa.deleteOne({ nama: req.body.nama }).then((result) => {
    req.flash("msg", `Data siswa ${req.body.nama} berhasil di hapus!`);
    res.redirect("/siswa");
  });
});

// halaman form ubah data siswa
app.get("/siswa/edit/:nama", authenticateUser, async (req, res) => {
  const siswa = await Siswa.findOne({ nama: req.params.nama });

  if (siswa && siswa.tgl_masuk) {
    siswa.tgl_masuk = new Date(siswa.tgl_masuk).toISOString().split("T")[0]; // Format: yyyy-mm-dd
  }

  res.render("edit-siswa", {
    title: "Form Ubah Data Siswa | Dapodik",
    layout: "./layouts/main.ejs",
    siswa,
  });
});

// proses ubah data siswa
app.put(
  "/siswa/", (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render("edit-siswa", {
        title: "Form Ubah Data Siswa | Dapodik",
        layout: "./layouts/main.ejs",
        errors: errors.array(),
        siswa: req.body,
      });
    } else {
      Siswa.updateOne(
        { _id: req.body._id },
        {
          $set: {
            nama: req.body.nama,
            jenisKelamin: req.body.jenisKelamin,
            nisn: req.body.nisn,
            nik: req.body.nik,
            nokk: req.body.nokk,
            tingkat: req.body.tingkat,
            rombel: req.body.rombel,
            tgl_masuk: req.body.tgl_masuk,
            terdaftar: req.body.terdaftar,
            ttl: req.body.ttl,
          },
        }
      ).then((result) => {
        // mengirimkan flash message
        req.flash("msg", `Data siswa ${req.body.nama} berhasil di ubah!`);
        res.redirect("/siswa");
      });
    }
  }
);

// halaman detail siswa
app.get("/siswa/:nama", authenticateUser, async (req, res) => {
  const siswa = await Siswa.findOne({ nama: req.params.nama });
  res.render("detail", {
    title: "Halaman Detail Siswa | Dapodik",
    layout: "./layouts/main.ejs",
    siswa,
  });
});

// Log out
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Gagal logout");
    }
    res.redirect("/login"); // Arahkan ke halaman login setelah logout
  });
});

// Middleware untuk menangkap error
app.use((err, req, res, next) => {
  console.error(err.stack); // Log error ke console
  res.status(500).render("error", {
    layout: "./layouts/main.ejs",
    title: "Error | Dapodik",
    message: "Maaf, terjadi kesalahan pada server. Silakan coba lagi nanti.",
  });
});

app.listen(port, () => {
  console.log(`Mongo Contact App | listening at http://localhost:${port}`);
});