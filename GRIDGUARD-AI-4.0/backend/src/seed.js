import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { connectDb } from "./config/db.js";
import User from "./models/User.js";
import Region from "./models/Region.js";
import Transformer from "./models/Transformer.js";
import SmartMeter from "./models/SmartMeter.js";

dotenv.config();

const states = [
  { name: "Maharashtra", code: "MH", geojsonId: "MH" },
  { name: "Gujarat", code: "GJ", geojsonId: "GJ" },
  { name: "Karnataka", code: "KA", geojsonId: "KA" },
  { name: "Tamil Nadu", code: "TN", geojsonId: "TN" },
  { name: "Delhi", code: "DL", geojsonId: "DL" }
];

const run = async () => {
  await connectDb(process.env.MONGO_URI);

  await Promise.all([
    User.deleteMany({}),
    Region.deleteMany({}),
    Transformer.deleteMany({}),
    SmartMeter.deleteMany({})
  ]);

  const passwordHash = await bcrypt.hash("admin123", 10);
  await User.create({ name: "Super Admin", email: "admin@gridguard.ai", passwordHash, role: "SUPER_ADMIN" });

  const regions = await Region.insertMany(
    states.map((s) => ({ name: s.name, type: "STATE", code: s.code, geojsonId: s.geojsonId }))
  );

  const transformers = [];
  const meters = [];

  regions.forEach((region, idx) => {
    for (let i = 0; i < 8; i += 1) {
      transformers.push({
        transformerId: `TR-${region.code}-${i + 1}`,
        region: region._id,
        capacityKva: 250 + i * 10,
        latitude: 19 + idx,
        longitude: 72 + i
      });
    }
  });

  const createdTransformers = await Transformer.insertMany(transformers);

  createdTransformers.forEach((t, i) => {
    for (let m = 0; m < 10; m += 1) {
      meters.push({
        meterId: `MT-${t.transformerId}-${m + 1}`,
        transformer: t._id,
        region: t.region,
        latitude: 19 + (i % 5),
        longitude: 72 + (m % 8)
      });
    }
  });

  await SmartMeter.insertMany(meters);

  console.log("Seed complete: admin user + regions + transformers + meters");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
