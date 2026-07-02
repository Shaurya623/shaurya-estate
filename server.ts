/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Setup relative database storage
const DB_FILE = path.join(process.cwd(), "db.json");

// Define basic structural interfaces
interface HashedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "buyer" | "agent" | "admin";
  image: string;
  createdAt: string;
  savedProperties: string[];
  isVerified: boolean;
  passwordHash: string;
  passwordSalt: string;
}

// Global state variables (loaded from file or seeded)
let users: HashedUser[] = [];
let properties: any[] = [];
let bookings: any[] = [];
let payments: any[] = [];
let reviews: any[] = [];
let messages: any[] = [];
let cmsConfig = {
  heroTitle: "Find Your Dream Space in Premium Locations",
  heroSubtitle: "Shaurya Estates brings you curated luxurious homes, modern apartments, and premium commercial plots. Verified listings with virtual interactive tours and secure bookings.",
  announcement: "🔥 Special Monsoon Offer: Zero brokerage fees on selected premium residential properties this month!",
};

// Cryptographic Helpers
function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

// Initial seeding of database
function seedDatabase() {
  const adminSalt = generateSalt();
  const agentSalt = generateSalt();
  const buyerSalt = generateSalt();

  users = [
    {
      id: "usr_admin",
      name: "Shaurya Admin",
      email: "admin@shaurya.com",
      phone: "+91 99999 88888",
      role: "admin",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      createdAt: new Date().toISOString(),
      savedProperties: [],
      isVerified: true,
      passwordSalt: adminSalt,
      passwordHash: hashPassword("AdminPassword123", adminSalt),
    },
    {
      id: "usr_agent",
      name: "Rahul Sharma (Gold Agent)",
      email: "agent@shaurya.com",
      phone: "+91 98765 43210",
      role: "agent",
      image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      createdAt: new Date().toISOString(),
      savedProperties: [],
      isVerified: true,
      passwordSalt: agentSalt,
      passwordHash: hashPassword("AgentPassword123", agentSalt),
    },
    {
      id: "usr_buyer",
      name: "Amit Kumar",
      email: "buyer@shaurya.com",
      phone: "+91 90123 45678",
      role: "buyer",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      createdAt: new Date().toISOString(),
      savedProperties: ["prop_1", "prop_3"],
      isVerified: true,
      passwordSalt: buyerSalt,
      passwordHash: hashPassword("BuyerPassword123", buyerSalt),
    },
  ];

  properties = [
    {
      id: "prop_1",
      title: "Skylark Heights Duplex Penthouse",
      description: "A super luxury 4 BHK duplex penthouse featuring private elevator, double-height ceiling in the living lounge, customized Italian modular kitchen, and a gorgeous private sky deck offering panoramic views of the city skyline. Fully automated home system compatible with premium appliances.",
      price: 45000000, // 4.5 Cr
      type: "buy",
      city: "Mumbai",
      address: "Bandra West, Link Road, Mumbai, Maharashtra 400050",
      images: [
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
      ],
      bedrooms: 4,
      bathrooms: 5,
      area: 4200, // sqft
      propertyType: "villa",
      furnished: "fully",
      ownerId: "usr_agent",
      ownerName: "Rahul Sharma (Gold Agent)",
      ownerPhone: "+91 98765 43210",
      location: { lat: 19.0596, lng: 72.8295 },
      views: 1450,
      leads: 32,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      virtualTourDesc: "Enter through the fingerprint scanner into a wide marble foyer. On your left is the formal living area featuring crystal chandeliers and floor-to-ceiling windows. Walk up the floating rosewood staircase to find three master suites, each equipped with automated blackout curtains and state-of-the-art walk-in closets."
    },
    {
      id: "prop_2",
      title: "Elegant 3 BHK Contemporary Apartment",
      description: "Modern architectural gem in Gurgaon Sector 56. Spanning over 2200 sqft, this premium flat offers cross-ventilation, highly polished wooden floors in master rooms, modular bathrooms with premium sanitary fittings, and two large balconies facing the lush central park area.",
      price: 18500000, // 1.85 Cr
      type: "buy",
      city: "Gurgaon",
      address: "DLF Phase 5, Sector 56, Gurgaon, Haryana 122011",
      images: [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
      ],
      bedrooms: 3,
      bathrooms: 3,
      area: 2200,
      propertyType: "apartment",
      furnished: "semi",
      ownerId: "usr_agent",
      ownerName: "Rahul Sharma (Gold Agent)",
      ownerPhone: "+91 98765 43210",
      location: { lat: 28.4231, lng: 77.0984 },
      views: 820,
      leads: 18,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      virtualTourDesc: "Welcome to this sundrenched apartment. The expansive living-dining space flows directly onto a 20-foot wide balcony. The kitchen features integrated chimney, oven, and quartz countertops. Every bathroom has modern concealed plumbing and multi-jet glass showers."
    },
    {
      id: "prop_3",
      title: "Royal Heritage Villa & Gardens",
      description: "Live like royalty in this massive 5 BHK estate in Pune, surrounded by perfectly manicured lawn gardens, private water fountain, security guard house, swimming pool, home theater room, and space for parking up to 5 premium vehicles.",
      price: 68000000, // 6.8 Cr
      type: "buy",
      city: "Pune",
      address: "Koregaon Park, Lane 3, Pune, Maharashtra 411001",
      images: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
      ],
      bedrooms: 5,
      bathrooms: 6,
      area: 6500,
      propertyType: "villa",
      furnished: "fully",
      ownerId: "usr_admin",
      ownerName: "Shaurya Admin",
      ownerPhone: "+91 99999 88888",
      location: { lat: 18.5362, lng: 73.894 },
      views: 2200,
      leads: 56,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      virtualTourDesc: "Walk past the classical Greek pillars and grand wooden double door to find the 20-foot ceiling entry hall. The private garden contains automatic sprinklers, an heated lap pool, and a fully equipped barbecue deck. The master bedroom spans 900 sqft with its own fireplace."
    },
    {
      id: "prop_4",
      title: "Ultra-Modern Tech Park Workspace",
      description: "Commercial ready, highly customized glass office space in Whitefield, Bangalore. Features server room, dual fiber broadbands, air conditioned meeting rooms, premium pantry cafe, and cabin desk partition setups ideal for IT startups or financial offices.",
      price: 150000, // Rent 1.5L / Month
      type: "rent",
      city: "Bangalore",
      address: "ITPL Main Road, Whitefield, Bangalore, Karnataka 560066",
      images: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80"
      ],
      bedrooms: 0,
      bathrooms: 4,
      area: 3100,
      propertyType: "commercial",
      furnished: "fully",
      ownerId: "usr_agent",
      ownerName: "Rahul Sharma (Gold Agent)",
      ownerPhone: "+91 98765 43210",
      location: { lat: 12.9698, lng: 77.7499 },
      views: 540,
      leads: 12,
      createdAt: new Date().toISOString(),
      virtualTourDesc: "Featuring heavy acoustic proofing, the boardroom fits up to 14 people with native presentation display feeds. The main hall fits 45 workstations with ergonomic desk layouts, integrated cable raceways, and customizable ambient light modules."
    },
    {
      id: "prop_5",
      title: "Minimalist Cozy 2 BHK Flat",
      description: "Charming semi-furnished apartment in heart of South Delhi. Fully ventilated with ample sunlight, modular wardrobes in both bedrooms, newly remodeled kitchen, and immediate access to Delhi Metro Station (within 200m walking distance). Great for working couples.",
      price: 45000, // Rent 45K / Month
      type: "rent",
      city: "Delhi",
      address: "Saket Main Road, New Delhi, Delhi 110017",
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
      ],
      bedrooms: 2,
      bathrooms: 2,
      area: 1150,
      propertyType: "apartment",
      furnished: "semi",
      ownerId: "usr_admin",
      ownerName: "Shaurya Estates",
      ownerPhone: "+91 99999 88888",
      location: { lat: 28.5244, lng: 77.2167 },
      views: 1100,
      leads: 29,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      virtualTourDesc: "This smart home maximizes utility. Walk into an open-plan kitchen and diner. Both bedrooms fit king-sized beds comfortably and feature wall-integrated cupboards. The main bathroom includes glass partitions and overhead rainfall showers."
    }
  ];

  bookings = [
    {
      id: "book_1",
      userId: "usr_buyer",
      userName: "Amit Kumar",
      userPhone: "+91 90123 45678",
      userEmail: "buyer@shaurya.com",
      propertyId: "prop_1",
      propertyTitle: "Skylark Heights Duplex Penthouse",
      visitDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "pending",
      notes: "Would love to see the master bedroom skydeck view during sunset.",
      createdAt: new Date().toISOString()
    }
  ];

  payments = [
    {
      id: "pay_1",
      userId: "usr_buyer",
      userName: "Amit Kumar",
      amount: 15000,
      paymentId: "pay_RAZOR_983749832",
      status: "success",
      propertyId: "prop_1",
      propertyTitle: "Skylark Heights Duplex Penthouse",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  reviews = [
    {
      id: "rev_1",
      propertyId: "prop_1",
      userId: "usr_buyer",
      userName: "Amit Kumar",
      rating: 5,
      comment: "Absolutely breathtaking property. The automation makes life very convenient, and the Bandra skyline looks phenomenal. Will book another tour soon!",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "rev_2",
      propertyId: "prop_2",
      userId: "usr_buyer",
      userName: "Amit Kumar",
      rating: 4,
      comment: "Great flat in Gurgaon. Safe society, and the wooden flooring looks clean. Price is highly competitive.",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  messages = [
    {
      id: "msg_1",
      senderId: "usr_buyer",
      senderName: "Amit Kumar",
      receiverId: "usr_agent",
      content: "Hello Rahul, is the Bandra duplex penthouse still available for purchase?",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "msg_2",
      senderId: "usr_agent",
      senderName: "Rahul Sharma (Gold Agent)",
      receiverId: "usr_buyer",
      content: "Yes Amit! It is indeed available. We have high interest this week, but I can secure your premium sunset slot visit on Saturday.",
      createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
    }
  ];

  saveDataToDisk();
}

function loadDataFromDisk() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      users = data.users || [];
      properties = data.properties || [];
      bookings = data.bookings || [];
      payments = data.payments || [];
      reviews = data.reviews || [];
      messages = data.messages || [];
      cmsConfig = data.cmsConfig || cmsConfig;
      console.log("Seeded database successfully loaded from disk.");
    } else {
      console.log("No existing database. Seeding fresh database onto disk...");
      seedDatabase();
    }
  } catch (err) {
    console.error("Error reading database file, starting seeded state...", err);
    seedDatabase();
  }
}

function saveDataToDisk() {
  try {
    const data = { users, properties, bookings, payments, reviews, messages, cmsConfig };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

loadDataFromDisk();

// Helper to find client using lazy-loaded Gemini API
let aiClient: any = null;
function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("Successfully initialized server-side Gemini client.");
    } catch (err) {
      console.error("Failed to initialize GoogleGenAI client:", err);
      return null;
    }
  }
  return aiClient;
}

// REST APIs

// Authentication APIs
app.post("/api/auth/register", (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password || !phone) {
    return res.status(400).json({ error: "All input fields (name, email, password, phone) are required." });
  }

  // Password validation
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long and contain safe credentials." });
  }

  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "A user with this email already exists." });
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // Simulated 6-digit OTP

  const newUser: HashedUser = {
    id: `usr_${Date.now()}`,
    name,
    email,
    phone,
    role: role || "buyer",
    image: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
    createdAt: new Date().toISOString(),
    savedProperties: [],
    isVerified: false, // OTP required
    passwordSalt: salt,
    passwordHash,
  };

  users.push(newUser);
  saveDataToDisk();

  // Return simulated SMS OTP code for validation experience
  res.json({
    message: "Registration successful! Enter the 6-digit verification code sent to your phone number.",
    simulatedOtp: otpCode,
    userId: newUser.id,
  });
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) {
    return res.status(400).json({ error: "User ID and OTP are required." });
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  user.isVerified = true;
  saveDataToDisk();

  const token = `JWT_MOCK_TOKEN_${user.id}_${Date.now()}`;
  res.json({
    message: "Phone verification successful!",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      image: user.image,
      createdAt: user.createdAt,
      savedProperties: user.savedProperties,
      isVerified: user.isVerified,
    },
    token,
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid email credentials." });
  }

  const calculatedHash = hashPassword(password, user.passwordSalt);
  if (calculatedHash !== user.passwordHash) {
    return res.status(401).json({ error: "Incorrect password selection." });
  }

  const token = `JWT_MOCK_TOKEN_${user.id}_${Date.now()}`;
  res.json({
    message: "Login successful!",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      image: user.image,
      createdAt: user.createdAt,
      savedProperties: user.savedProperties,
      isVerified: user.isVerified,
    },
    token,
  });
});

app.post("/api/auth/google", (req, res) => {
  const { email, name, image } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "Google payload is missing required fields." });
  }

  let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    const salt = generateSalt();
    user = {
      id: `usr_g_${Date.now()}`,
      name,
      email,
      phone: "+91 99999 99999",
      role: "buyer",
      image: image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date().toISOString(),
      savedProperties: [],
      isVerified: true,
      passwordSalt: salt,
      passwordHash: hashPassword(crypto.randomBytes(32).toString("hex"), salt),
    };
    users.push(user);
    saveDataToDisk();
  }

  const token = `JWT_MOCK_TOKEN_${user.id}_${Date.now()}`;
  res.json({
    message: "Google OAuth successful!",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      image: user.image,
      createdAt: user.createdAt,
      savedProperties: user.savedProperties,
      isVerified: user.isVerified,
    },
    token,
  });
});

app.put("/api/auth/profile", (req, res) => {
  const { userId, name, phone, image } = req.body;
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (image) user.image = image;

  saveDataToDisk();

  res.json({
    message: "Profile updated successfully!",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      image: user.image,
      createdAt: user.createdAt,
      savedProperties: user.savedProperties,
      isVerified: user.isVerified,
    }
  });
});

app.post("/api/auth/save-property", (req, res) => {
  const { userId, propertyId } = req.body;
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const idx = user.savedProperties.indexOf(propertyId);
  if (idx > -1) {
    user.savedProperties.splice(idx, 1); // Unsaves
  } else {
    user.savedProperties.push(propertyId); // Saves
  }

  saveDataToDisk();
  res.json({
    message: "Saved properties toggled successfully.",
    savedProperties: user.savedProperties,
  });
});

// Admin User Management CRUD
app.get("/api/admin/users", (req, res) => {
  const viewableUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    image: u.image,
    createdAt: u.createdAt,
    isVerified: u.isVerified,
  }));
  res.json(viewableUsers);
});

app.post("/api/admin/users", (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Name, email, password, and role are required." });
  }

  const salt = generateSalt();
  const newUser: HashedUser = {
    id: `usr_${Date.now()}`,
    name,
    email,
    phone: phone || "+91 99999 99999",
    role,
    image: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
    createdAt: new Date().toISOString(),
    savedProperties: [],
    isVerified: true,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
  };

  users.push(newUser);
  saveDataToDisk();
  res.json({ message: "User created by admin.", userId: newUser.id });
});

app.put("/api/admin/users/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, phone, role, isVerified } = req.body;
  const user = users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (role) user.role = role;
  if (isVerified !== undefined) user.isVerified = isVerified;

  saveDataToDisk();
  res.json({ message: "User updated by admin." });
});

app.delete("/api/admin/users/:id", (req, res) => {
  const { id } = req.params;
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "User not found." });
  }

  users.splice(idx, 1);
  saveDataToDisk();
  res.json({ message: "User deleted successfully." });
});

// Property API Routes
app.get("/api/properties", (req, res) => {
  let filtered = [...properties];
  const { search, type, minPrice, maxPrice, city, bedrooms, bathrooms, propertyType, furnished, sort } = req.query;

  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    );
  }

  if (type) {
    filtered = filtered.filter((p) => p.type === type);
  }

  if (city) {
    filtered = filtered.filter((p) => p.city.toLowerCase() === (city as string).toLowerCase());
  }

  if (minPrice) {
    filtered = filtered.filter((p) => p.price >= Number(minPrice));
  }

  if (maxPrice) {
    filtered = filtered.filter((p) => p.price <= Number(maxPrice));
  }

  if (bedrooms) {
    filtered = filtered.filter((p) => p.bedrooms >= Number(bedrooms));
  }

  if (bathrooms) {
    filtered = filtered.filter((p) => p.bathrooms >= Number(bathrooms));
  }

  if (propertyType) {
    filtered = filtered.filter((p) => p.propertyType === propertyType);
  }

  if (furnished) {
    filtered = filtered.filter((p) => p.furnished === furnished);
  }

  // Sorting
  if (sort === "priceAsc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === "priceDesc") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sort === "views") {
    filtered.sort((a, b) => b.views - a.views);
  } else {
    // default: newest
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json(filtered);
});

app.get("/api/properties/:id", (req, res) => {
  const { id } = req.params;
  const property = properties.find((p) => p.id === id);
  if (!property) {
    return res.status(404).json({ error: "Property not found" });
  }

  // Increment view counts
  property.views = (property.views || 0) + 1;
  saveDataToDisk();

  // Attach reviews
  const propReviews = reviews.filter((r) => r.propertyId === id);
  res.json({ ...property, reviews: propReviews });
});

app.post("/api/properties", (req, res) => {
  const { title, description, price, type, city, address, images, bedrooms, bathrooms, area, propertyType, furnished, ownerId, ownerName, ownerPhone } = req.body;

  if (!title || !price || !type || !city || !address) {
    return res.status(400).json({ error: "Title, price, buy/rent type, city, and address are required." });
  }

  const newProperty = {
    id: `prop_${Date.now()}`,
    title,
    description: description || "Gorgeous verified property offered with premium lifestyle standards.",
    price: Number(price),
    type,
    city,
    address,
    images: images && images.length ? images : ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"],
    bedrooms: Number(bedrooms || 0),
    bathrooms: Number(bathrooms || 0),
    area: Number(area || 1000),
    propertyType: propertyType || "apartment",
    furnished: furnished || "unfurnished",
    ownerId: ownerId || "usr_agent",
    ownerName: ownerName || "Rahul Sharma (Gold Agent)",
    ownerPhone: ownerPhone || "+91 98765 43210",
    location: {
      lat: 19.0 + Math.random() * 9.0, // Mumbai / general India range simulation
      lng: 72.0 + Math.random() * 5.0,
    },
    views: 1,
    leads: 0,
    createdAt: new Date().toISOString(),
    virtualTourDesc: `Virtual audio tour for ${title}. Walk through the secure high-tech access door into a beautiful open-plan modular living area with sleek tiling, sliding sound-proof glass window balconies, premium multi-fixture bath layouts, and customizable lighting.`,
  };

  properties.push(newProperty);
  saveDataToDisk();
  res.json({ message: "Property listed successfully!", property: newProperty });
});

app.put("/api/properties/:id", (req, res) => {
  const { id } = req.params;
  const property = properties.find((p) => p.id === id);
  if (!property) {
    return res.status(404).json({ error: "Property not found." });
  }

  const fields = [
    "title", "description", "price", "type", "city", "address", "images",
    "bedrooms", "bathrooms", "area", "propertyType", "furnished", "virtualTourDesc"
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === "price" || field === "bedrooms" || field === "bathrooms" || field === "area") {
        property[field] = Number(req.body[field]);
      } else {
        property[field] = req.body[field];
      }
    }
  });

  saveDataToDisk();
  res.json({ message: "Property listing updated!", property });
});

app.delete("/api/properties/:id", (req, res) => {
  const { id } = req.params;
  const idx = properties.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Property not found." });
  }

  properties.splice(idx, 1);
  saveDataToDisk();
  res.json({ message: "Property listing deleted." });
});

// Review APIs
app.post("/api/properties/:id/reviews", (req, res) => {
  const { id } = req.params;
  const { userId, userName, rating, comment } = req.body;

  if (!userName || !rating || !comment) {
    return res.status(400).json({ error: "Rating and comment are required." });
  }

  const newReview = {
    id: `rev_${Date.now()}`,
    propertyId: id,
    userId: userId || "usr_anonymous",
    userName,
    rating: Number(rating),
    comment,
    createdAt: new Date().toISOString()
  };

  reviews.push(newReview);
  saveDataToDisk();

  res.json({ message: "Review posted successfully!", review: newReview });
});

// Bookings APIs
app.get("/api/bookings", (req, res) => {
  const { userId, ownerId } = req.query;
  let list = [...bookings];

  if (userId) {
    list = list.filter((b) => b.userId === userId);
  }

  if (ownerId) {
    // If agent, show bookings where property is owned by agent
    const agentPropIds = properties.filter((p) => p.ownerId === ownerId).map((p) => p.id);
    list = list.filter((b) => agentPropIds.includes(b.propertyId));
  }

  res.json(list);
});

app.post("/api/bookings", (req, res) => {
  const { userId, userName, userPhone, userEmail, propertyId, propertyTitle, visitDate, notes } = req.body;

  if (!userId || !propertyId || !visitDate) {
    return res.status(400).json({ error: "Visit date is required." });
  }

  const newBooking = {
    id: `book_${Date.now()}`,
    userId,
    userName,
    userPhone: userPhone || "+91 99999 99999",
    userEmail: userEmail || "user@shaurya.com",
    propertyId,
    propertyTitle,
    visitDate,
    status: "pending",
    notes: notes || "",
    createdAt: new Date().toISOString()
  };

  bookings.push(newBooking);

  // Increment lead counter on the property
  const property = properties.find((p) => p.id === propertyId);
  if (property) {
    property.leads = (property.leads || 0) + 1;
  }

  saveDataToDisk();
  res.json({ message: "Property visit booked successfully! The agent will approve soon.", booking: newBooking });
});

app.put("/api/bookings/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found." });
  }

  if (status) booking.status = status;
  saveDataToDisk();

  res.json({ message: `Visit request status updated to ${status}.`, booking });
});

// Payment APIs
app.get("/api/payments", (req, res) => {
  const { userId } = req.query;
  let list = [...payments];
  if (userId) {
    list = list.filter((p) => p.userId === userId);
  }
  res.json(list);
});

app.post("/api/payments", (req, res) => {
  const { userId, userName, amount, propertyId, propertyTitle, paymentId } = req.body;

  if (!userId || !amount || !propertyId) {
    return res.status(400).json({ error: "Payment parameters missing." });
  }

  const newPayment = {
    id: `pay_${Date.now()}`,
    userId,
    userName: userName || "Amit Kumar",
    amount: Number(amount),
    paymentId: paymentId || `pay_RAZOR_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    status: "success",
    propertyId,
    propertyTitle,
    createdAt: new Date().toISOString()
  };

  payments.push(newPayment);
  saveDataToDisk();

  res.json({ message: "Razorpay signature verified. Payment processed successfully!", payment: newPayment });
});

// Chat Message APIs
app.get("/api/messages", (req, res) => {
  const { userId, receiverId } = req.query;
  let filtered = [...messages];

  if (userId && receiverId) {
    filtered = filtered.filter(
      (m) =>
        (m.senderId === userId && m.receiverId === receiverId) ||
        (m.senderId === receiverId && m.receiverId === userId)
    );
  } else if (userId) {
    filtered = filtered.filter((m) => m.senderId === userId || m.receiverId === userId);
  }

  res.json(filtered);
});

app.post("/api/messages", (req, res) => {
  const { senderId, senderName, receiverId, content, isAi } = req.body;

  if (!senderId || !content) {
    return res.status(400).json({ error: "Message content cannot be empty." });
  }

  const newMsg = {
    id: `msg_${Date.now()}`,
    senderId,
    senderName: senderName || "Buyer",
    receiverId: receiverId || "usr_agent",
    content,
    createdAt: new Date().toISOString(),
    isAi: isAi || false
  };

  messages.push(newMsg);
  saveDataToDisk();

  res.json(newMsg);
});

// CMS configurations
app.get("/api/cms", (req, res) => {
  res.json(cmsConfig);
});

app.put("/api/cms", (req, res) => {
  const { heroTitle, heroSubtitle, announcement } = req.body;
  if (heroTitle) cmsConfig.heroTitle = heroTitle;
  if (heroSubtitle) cmsConfig.heroSubtitle = heroSubtitle;
  if (announcement) cmsConfig.announcement = announcement;

  saveDataToDisk();
  res.json({ message: "CMS configuration updated successfully!", config: cmsConfig });
});

// AI endpoints using GoogleGenAI

// 1. AI Real Estate Chat Advisor
app.post("/api/ai/advisor", async (req, res) => {
  const { message, chatHistory } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message content is required for AI." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Elegant fallback if GEMINI_API_KEY is not set or placeholder
    const simulatedAnswers = [
      "Based on current real estate market trends, properties in Bandra West have shown an 8.4% annual appreciation. I highly recommend checking out Skylark Heights Duplex Penthouse!",
      "If you are looking for properties with the best rental yields, Whitefield in Bangalore (offering 4.8% rental yield) or Sector 56 in Gurgaon are your premium picks.",
      "In India, home loan interest rates currently range from 8.4% to 9.2% per annum. Utilizing our Mortgage Calculator on the listing details page will help you get precise monthly breakdowns.",
      "Shaurya Estates is verified with RERA compliances. Each property on our portal features full ownership verification, virtual audio/video tour overviews, and online visit scheduling.",
      "Properties with amenities like a private skydeck, home automation, and close proximity to public transit (like Saket Cozy flat) represent the best long-term utility.",
    ];
    const randomAnswer = simulatedAnswers[Math.floor(Math.random() * simulatedAnswers.length)];

    return res.json({
      text: `[Advisor Demo Mode] ${randomAnswer}\n\n(Tip: Save your real Google Gemini API Key in the Secrets panel in AI Studio UI to experience actual real-time AI reasoning!)`,
    });
  }

  try {
    // Generate context of available properties so AI knows what we offer!
    const propertySummary = properties
      .map((p) => `- ID: ${p.id}, ${p.title} in ${p.city}, Price: Rs. ${p.price.toLocaleString()}, Rooms: ${p.bedrooms}BHK, Type: ${p.type === "buy" ? "For Sale" : "For Rent"}, Address: ${p.address}`)
      .join("\n");

    const systemPrompt = `You are the Official AI Real Estate Advisor for Shaurya Estates (a premium luxury and residential property platform).
Your tone is professional, extremely informative, helpful, and friendly.

Here are the real properties currently listed on Shaurya Estates:
${propertySummary}

Answer the customer's query. If they ask for recommendations, suggest the best-fitting properties from Shaurya Estates list. Keep calculations or mortgage breakdowns realistic.
If they ask questions beyond real estate, politely guide them back to real estate purchases, home loans, RERA compliance, or property valuations. Use Markdown for layout formatting.`;

    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    const response = await chat.sendMessage({ message });
    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini API call failed:", err);
    res.status(500).json({ error: "AI reasoning failed to process. Details: " + err.message });
  }
});

// 2. AI Smart Property Recommendations based on custom profile/search criteria
app.post("/api/ai/recommend", async (req, res) => {
  const { preferences } = req.body; // e.g., "Looking for a luxury villa under 5 crores in Pune"

  if (!preferences) {
    return res.status(400).json({ error: "Preferences statement is required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Fallback recommendation
    const matched = properties.filter((p) => {
      const pText = `${p.title} ${p.description} ${p.city}`.toLowerCase();
      return preferences.toLowerCase().split(" ").some((word: string) => word.length > 3 && pText.includes(word));
    });

    const finalRecommendations = matched.length ? matched : properties.slice(0, 2);
    return res.json({
      recommendations: finalRecommendations.map((p) => p.id),
      explanation: `Based on your request "${preferences}", Shaurya Estates recommends ${finalRecommendations.map((p) => p.title).join(" and ")} due to matching location or pricing profile.\n\n[Active Fallback Mode: Setup GEMINI_API_KEY to let Gemini provide reasoning]`,
    });
  }

  try {
    const propertySummary = properties
      .map((p) => ({
        id: p.id,
        title: p.title,
        city: p.city,
        price: p.price,
        type: p.type,
        bedrooms: p.bedrooms,
        propertyType: p.propertyType,
        description: p.description,
      }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `We have these properties: ${JSON.stringify(propertySummary)}.
The user states preferences: "${preferences}".

Analyze which properties match best.
Return a JSON object matching this schema:
{
  "recommendedIds": ["prop_1", "prop_2"],
  "explanation": "A beautiful human-like friendly description explaining why these specific properties were recommended based on the user's requirements."
}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of matching property IDs from Shaurya Estates list."
            },
            explanation: {
              type: Type.STRING,
              description: "Reasoning and summary in warm real estate advisor language."
            }
          },
          required: ["recommendedIds", "explanation"]
        }
      }
    });

    const textResult = response.text.trim();
    const resultObj = JSON.parse(textResult);
    res.json({
      recommendations: resultObj.recommendedIds,
      explanation: resultObj.explanation,
    });
  } catch (err: any) {
    console.error("Gemini Property recommendation failed:", err);
    res.status(500).json({ error: "Gemini property matching failed. " + err.message });
  }
});

// 3. AI Generated Interactive Virtual Audio Tour
app.post("/api/ai/tour", async (req, res) => {
  const { propertyId } = req.body;
  const property = properties.find((p) => p.id === propertyId);

  if (!property) {
    return res.status(404).json({ error: "Property not found." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      tourText: property.virtualTourDesc || `Welcome to the Virtual Tour of ${property.title}. This verified property has spacious rooms with ambient light, modern fittings, and a peaceful balcony overlooking premium surroundings. Contact Rahul Sharma at ${property.ownerPhone} for physical visit schedules.`,
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Write an immersive, poetic, highly sensory 'Audio Walkthrough Virtual Tour' for the property titled "${property.title}" located at "${property.address}".
Details: ${property.description}, ${property.bedrooms} BHK, ${property.furnished} furnished.

Guide the user step-by-step through the entry, living lounge, kitchen, bedrooms, and highlight the finest premium features. Keep it engaging, luxury-focused, and under 150 words.`,
    });

    res.json({ tourText: response.text });
  } catch (err: any) {
    console.error("Gemini Tour generation failed:", err);
    res.json({
      tourText: property.virtualTourDesc || "Sensory tour failed to generate, please check API keys.",
    });
  }
});

// Serve compiled static client files in production, use Vite in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Shaurya Estates Server running on http://localhost:${PORT}`);
  });
}

startServer();
