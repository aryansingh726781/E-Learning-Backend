






import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import cloudinary from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
// const URL = "mongodb+srv://aryansingh726781_db_user:DzSX1yy9ig4irm2X@cluster0.zod8x5c.mongodb.net/?appName=Cluster0"
const app = express();
app.use(express.json());
app.use(cors());


// mongoose.connect("mongodb://127.0.0.1:27017/elearning");
mongoose.connect(
  "mongodb+srv://aryansingh726781_db_user:DzSX1yy9ig4irm2X@cluster0.zod8x5c.mongodb.net/?appName=Cluster0",
  {
    serverSelectionTimeoutMS: 10000,
  }
)
.then(() => console.log("✅ MongoDB Atlas connected"))
.catch(err => console.error("❌ MongoDB error:", err));


const JWT_SECRET = "secret123";

/* ================= CLOUDINARY ================= */
cloudinary.v2.config({
  cloud_name: "Aryan",
  api_key: "soni",
  api_secret: "argdguyguf",
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: "elearning",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

/* ================= SCHEMAS ================= */
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
});

const CourseSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  image: String,
});

const InstructorSchema = new mongoose.Schema({
  name: String,
  skill: String,
  image: String,
});

const BlogSchema = new mongoose.Schema({
  title: String,
  content: String,
  image: String,
});

const EnrollmentSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);


const ContactSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    address: String,
    message: String,
  },
  { timestamps: true }
);

const Contact = mongoose.model("Contact", ContactSchema);



const Enrollment = mongoose.model("Enrollment", EnrollmentSchema);


const User = mongoose.model("User", UserSchema);
const Course = mongoose.model("Course", CourseSchema);
const Instructor = mongoose.model("Instructor", InstructorSchema);
const Blog = mongoose.model("Blog", BlogSchema);

/* ================= MIDDLEWARE ================= */
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.sendStatus(401);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
};

const admin = (req, res, next) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  next();
};

/* ================= AUTH ================= */
app.post("/api/register", async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({ ...req.body, password: hash });
  res.json(user);
});

app.post("/api/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.password)))
    return res.sendStatus(401);

  const token = jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET
  );
 

  res.json({ token, role: user.role, user });
});

/* ================= COURSES CRUD ================= */
app.get("/api/courses", async (_, res) => {
  res.json(await Course.find());
});

app.get("/api/courses/:id", async (req, res) => {
  res.json(await Course.findById(req.params.id));
});

app.post("/api/courses", auth, admin, async (req, res) => {
  res.json(await Course.create(req.body));
});

app.put("/api/courses/:id", auth, admin, async (req, res) => {
  res.json(await Course.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

app.delete("/api/courses/:id", auth, admin, async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.json({ message: "Course deleted" });
});

/* ================= ENROLL COURSE ================= */
// app.post("/api/enroll/:id", auth, async (req, res) => {
//   const user = await User.findById(req.user.id);
//   if (!user.enrolledCourses.includes(req.params.id)) {
//     user.enrolledCourses.push(req.params.id);
//     await user.save();
//   }
//   res.json({ message: "Enrolled successfully" });
// });


app.post("/api/enroll/:id", auth, async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ message: "All fields required" });
  }

  const enrollment = await Enrollment.create({
    name,
    email,
    phone,
    course: req.params.id,
    user: req.user.id,
  });

  // optional: track course in user profile
  await User.findByIdAndUpdate(req.user.id, {
    $addToSet: { enrolledCourses: req.params.id },
  });

  res.json({ message: "Enrollment successful", enrollment });
});
// get all erollments 

app.get("/api/admin/enrolls", auth, admin, async (req, res) => {
  const enrolls = await Enrollment.find()
    .populate("course", "title")
    .populate("user", "name email");

  res.json(enrolls);
});

// delete enroll

app.delete("/api/admin/enrolls/:id", auth, admin, async (req, res) => {
  await Enrollment.findByIdAndDelete(req.params.id);
  res.json({ message: "Enrollment deleted" });
});


/* ================= INSTRUCTORS CRUD ================= */
app.get("/api/instructors", async (_, res) => {
  res.json(await Instructor.find());
});

app.post("/api/instructors", auth, admin, async (req, res) => {
  res.json(await Instructor.create(req.body));
});

app.put("/api/instructors/:id", auth, admin, async (req, res) => {
  res.json(await Instructor.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

app.delete("/api/instructors/:id", auth, admin, async (req, res) => {
  await Instructor.findByIdAndDelete(req.params.id);
  res.json({ message: "Instructor deleted" });
});

/* ================= BLOGS CRUD ================= */
app.get("/api/blogs", async (_, res) => {
  res.json(await Blog.find());
});

app.get("/api/blogs/:id", async (req, res) => {
  res.json(await Blog.findById(req.params.id));
});

app.post("/api/blogs", auth, admin, async (req, res) => {
  res.json(await Blog.create(req.body));
});

app.put("/api/blogs/:id", auth, admin, async (req, res) => {
  res.json(await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

app.delete("/api/blogs/:id", auth, admin, async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.json({ message: "Blog deleted" });
});

/* ================= ADMIN DASHBOARD ================= */
app.get("/api/admin/stats", auth, admin, async (_, res) => {
  res.json({
    users: await User.countDocuments(),
    courses: await Course.countDocuments(),
    instructors: await Instructor.countDocuments(),
    blogs: await Blog.countDocuments(),
  });
});

// contact FormData
/* ================= CONTACT ================= */
app.post("/api/contact", async (req, res) => {
  try {
    const contact = await Contact.create(req.body);
    res.json({ message: "Message sent successfully", contact });
  } catch (err) {
    res.status(500).json({ message: "Failed to send message" });
  }
});



/* GET ALL CONTACTS (ADMIN ONLY) */
app.get("/api/admin/contact", auth , admin, async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

/* DELETE CONTACT (ADMIN ONLY) */
app.delete("/api/admin/contact/:id", auth, admin, async (req, res) => {
  await Contact.findByIdAndDelete(req.params.id);
  res.json({ message: "Contact deleted" });
});




/* ================= IMAGE UPLOAD ================= */
app.post("/api/upload", auth, admin, upload.single("image"), (req, res) => {
  res.json({ url: req.file.path });
});

app.listen(5000, () => console.log("✅ Backend running on port 5000"));
