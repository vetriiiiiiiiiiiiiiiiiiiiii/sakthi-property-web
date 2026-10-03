import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./prisma.js";
import { registerAuth, requireAdmin, logAudit } from "./auth.js";
import { auditMiddleware, apiLimiter, uploadLimiter, securityHeaders, requestLogger, errorHandler } from "../middleware.js";
import { readStoredFile, storeUploadedFile } from "./fileStorage.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = String(process.env.CLIENT_ORIGINS || "http://localhost:3000")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const tenantInclude = { familyMembers: true, documents: true, rentHistory: true };
const nullableNumber = (value) => value === "" || value === undefined || value === null ? null : Number(value);
const nullableInt = (value) => value === "" || value === undefined || value === null ? null : Number.parseInt(value, 10);
const nullableDate = (value) => value ? new Date(value) : null;
const nullableText = (value) => value === "" || value === undefined ? null : value;

app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(requestLogger);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  },
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use(auditMiddleware);
app.use(apiLimiter);
registerAuth(app, prisma);
app.use(["/api/properties", "/api/tenants", "/api/rent-records", "/api/bills", "/api/maintenance", "/api/storage", "/api/notifications", "/api/data"], requireAdmin);

app.post("/api/files", requireAdmin, uploadLimiter, express.raw({ type: "application/octet-stream", limit: "10mb" }), async (req, res, next) => {
  try {
    const file = await storeUploadedFile(req.query.name, req.body);
    res.status(201).json(file);
  } catch (error) { next(error); }
});
app.get("/api/files/:id", requireAdmin, async (req, res, next) => {
  try {
    const file = await readStoredFile(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found." });
    res.set({ "Content-Type": file.mimeType, "Content-Disposition": "inline", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    res.send(file.data);
  } catch (error) { next(error); }
});
function requireFields(res, ...values) {
  if (values.some((value) => !value)) {
    res.status(400).json({ message: "Required fields are missing." });
    return false;
  }
  return true;
}

function propertyData(body) {
  return {
    name: body.name?.trim(), type: body.type || "House", address: body.address?.trim(), state: nullableText(body.state), city: nullableText(body.city), pincode: nullableText(body.pincode),
    ownerName: body.ownerName?.trim(), ownerPhone: body.ownerPhone?.trim(), status: body.status || "Available", rentAmount: nullableNumber(body.rentAmount), monthlyMaintenance: nullableNumber(body.monthlyMaintenance),
    expectedPrice: nullableNumber(body.expectedPrice), pricePerSqft: nullableNumber(body.pricePerSqft), totalFloors: nullableInt(body.totalFloors), floorNumber: nullableText(body.floorNumber), flatType: nullableText(body.flatType), flatsCount: nullableInt(body.flatsCount) ?? 1,
    length: nullableNumber(body.length), width: nullableNumber(body.width), carpetArea: nullableNumber(body.carpetArea), builtupArea: nullableNumber(body.builtupArea), plotArea: nullableNumber(body.plotArea),
    facingRoad: nullableText(body.facingRoad), landUse: nullableText(body.landUse), direction: nullableText(body.direction), furnished: nullableText(body.furnished), additionalDetails: nullableText(body.additionalDetails), forSale: Boolean(body.forSale), listed: Boolean(body.listed),
    fileAttachments: { ownerDocuments: body.ownerDocuments || {}, ownerDocumentsList: body.ownerDocumentsList || [], propertyDocumentsList: body.propertyDocumentsList || [] },
  };
}

function propertyResponse(property) {
  const { fileAttachments, ...data } = property;
  return { ...data, ...(fileAttachments || {}) };
}

function tenantData(body) {
  return {
    propertyId: body.propertyId, fullName: body.fullName?.trim(), phone: body.phone?.trim(), dob: nullableDate(body.dob), gender: nullableText(body.gender), maritalStatus: nullableText(body.maritalStatus),
    livingInHouse: nullableText(body.livingInHouse), education: nullableText(body.education), occupation: nullableText(body.occupation), religion: nullableText(body.religion), email: nullableText(body.email), nativeAddress: nullableText(body.nativeAddress), workAddress: nullableText(body.workAddress),
    familyCount: nullableInt(body.familyCount) ?? 0, rehotraType: nullableText(body.rehotraType), rehotraNumber: nullableText(body.rehotraNumber), rentAmount: nullableNumber(body.rentAmount), advanceAmount: nullableNumber(body.advanceAmount), maintenanceFee: nullableNumber(body.maintenanceFee), brokerageFee: nullableNumber(body.brokerageFee),
    dateOfComing: nullableDate(body.dateOfComing), dateOfLeaving: nullableDate(body.dateOfLeaving), profilePhoto: nullableText(body.profilePhoto), status: body.status || "Active",
    fileAttachments: { documents: body.documents || {}, documentsList: body.documentsList || [] },
  };
}

function tenantResponse(tenant) {
  const { fileAttachments, ...data } = tenant;
  return { ...data, ...(fileAttachments || {}) };
}

app.get("/api/health", async (req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ success: true, database: "connected" }); }
  catch { res.status(500).json({ success: false, message: "Database connection failed" }); }
});

app.get("/api/data", async (req, res, next) => {
  try {
    const [properties, tenants, bills, maintenance, notifications] = await Promise.all([
      prisma.property.findMany({ orderBy: { createdAt: "desc" } }).then((items) => items.map(propertyResponse)),
      prisma.tenant.findMany({ include: tenantInclude, orderBy: { createdAt: "desc" } }).then((items) => items.map(tenantResponse)),
      prisma.bill.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.maintenance.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.notification.findMany({ orderBy: { createdAt: "desc" } }),
    ]);
    res.json({ properties, tenants, bills, maintenance, notifications });
  } catch (error) { next(error); }
});

app.get("/api/properties", async (req, res, next) => { try { res.json((await prisma.property.findMany({ orderBy: { createdAt: "desc" } })).map(propertyResponse)); } catch (error) { next(error); } });
app.post("/api/properties", async (req, res, next) => {
  try { const data = propertyData(req.body); if (!requireFields(res, data.name, data.address, data.ownerName, data.ownerPhone)) return; res.status(201).json(propertyResponse(await prisma.property.create({ data }))); } catch (error) { next(error); }
});
app.put("/api/properties/:id", async (req, res, next) => {
  try { const data = propertyData(req.body); if (!requireFields(res, data.name, data.address, data.ownerName, data.ownerPhone)) return; res.json(propertyResponse(await prisma.property.update({ where: { id: req.params.id }, data }))); } catch (error) { next(error); }
});
app.delete("/api/properties/:id", async (req, res, next) => { try { await prisma.property.delete({ where: { id: req.params.id } }); res.status(204).end(); } catch (error) { next(error); } });

app.get("/api/tenants", async (req, res, next) => { try { res.json((await prisma.tenant.findMany({ include: tenantInclude, orderBy: { createdAt: "desc" } })).map(tenantResponse)); } catch (error) { next(error); } });
app.post("/api/tenants", async (req, res, next) => {
  try {
    const data = tenantData(req.body); if (!requireFields(res, data.propertyId, data.fullName, data.phone)) return;
    const tenant = await prisma.$transaction(async (tx) => {
      await tx.tenant.updateMany({ where: { propertyId: data.propertyId, status: "Active" }, data: { status: "Archived", dateOfLeaving: new Date() } });
      const created = await tx.tenant.create({
        data: {
          ...data,
          familyMembers: {
            create: (req.body.familyMembers || []).filter((member) => member.name?.trim()).map((member) => ({ relation: nullableText(member.relation), name: member.name.trim(), phone: nullableText(member.phone) })),
          },
        },
        include: tenantInclude,
      });
      await tx.property.update({ where: { id: data.propertyId }, data: { status: "Occupied" } });
      return tenantResponse(created);
    });
    res.status(201).json(tenant);
  } catch (error) { next(error); }
});
app.put("/api/tenants/:id", async (req, res, next) => {
  try {
    const data = tenantData(req.body); if (!requireFields(res, data.propertyId, data.fullName, data.phone)) return;
    const tenant = await prisma.$transaction(async (tx) => {
      await tx.familyMember.deleteMany({ where: { tenantId: req.params.id } });
      return tx.tenant.update({ where: { id: req.params.id }, data: { ...data, familyMembers: { create: (req.body.familyMembers || []).filter((member) => member.name?.trim()).map((member) => ({ relation: nullableText(member.relation), name: member.name.trim(), phone: nullableText(member.phone) })) } }, include: tenantInclude });
    });
    res.json(tenantResponse(tenant));
  } catch (error) { next(error); }
});
app.patch("/api/tenants/:id/status", async (req, res, next) => {
  try { const archived = req.body.status === "Archived"; res.json(tenantResponse(await prisma.tenant.update({ where: { id: req.params.id }, data: { status: archived ? "Archived" : "Active", dateOfLeaving: archived ? new Date() : null }, include: tenantInclude }))); } catch (error) { next(error); }
});
app.delete("/api/tenants/:id", async (req, res, next) => { try { await prisma.tenant.delete({ where: { id: req.params.id } }); res.status(204).end(); } catch (error) { next(error); } });

app.post("/api/tenants/:id/rent-records", async (req, res, next) => {
  try {
    const data = { tenantId: req.params.id, month: req.body.month, year: nullableInt(req.body.year), amount: nullableNumber(req.body.amount), status: req.body.status || "Pending", dueDate: nullableDate(req.body.dueDate), paidDate: nullableDate(req.body.paidDate) };
    if (!requireFields(res, data.month, data.year, data.amount !== null)) return;
    res.status(201).json(await prisma.rentRecord.create({ data }));
  } catch (error) { next(error); }
});
app.patch("/api/rent-records/:id", async (req, res, next) => {
  try {
    const data = { ...(req.body.amount !== undefined ? { amount: nullableNumber(req.body.amount) } : {}), ...(req.body.status ? { status: req.body.status } : {}), ...(req.body.dueDate !== undefined ? { dueDate: nullableDate(req.body.dueDate) } : {}), ...(req.body.paidDate !== undefined ? { paidDate: nullableDate(req.body.paidDate) } : {}) };
    res.json(await prisma.rentRecord.update({ where: { id: req.params.id }, data }));
  } catch (error) { next(error); }
});
app.get("/api/rent-records", async (req, res, next) => { try { res.json(await prisma.rentRecord.findMany({ orderBy: { createdAt: "desc" } })); } catch (error) { next(error); } });

app.get("/api/bills", async (req, res, next) => { try { res.json(await prisma.bill.findMany({ orderBy: { createdAt: "desc" } })); } catch (error) { next(error); } });
app.post("/api/bills", async (req, res, next) => {
  try { const data = { propertyId: req.body.propertyId, amount: nullableNumber(req.body.amount), dueDate: nullableDate(req.body.dueDate), status: req.body.status || "Pending", description: nullableText(req.body.description || req.body.month) }; if (!requireFields(res, data.propertyId, data.amount !== null)) return; res.status(201).json(await prisma.bill.create({ data })); } catch (error) { next(error); }
});
app.patch("/api/bills/:id", async (req, res, next) => { try { res.json(await prisma.bill.update({ where: { id: req.params.id }, data: { ...(req.body.status ? { status: req.body.status } : {}), ...(req.body.description !== undefined ? { description: nullableText(req.body.description) } : {}) } })); } catch (error) { next(error); } });
app.delete("/api/bills/:id", async (req, res, next) => { try { await prisma.bill.delete({ where: { id: req.params.id } }); res.status(204).end(); } catch (error) { next(error); } });

app.get("/api/maintenance", async (req, res, next) => { try { res.json(await prisma.maintenance.findMany({ orderBy: { createdAt: "desc" } })); } catch (error) { next(error); } });
app.post("/api/maintenance", async (req, res, next) => { try { const data = { propertyId: req.body.propertyId, title: req.body.title?.trim(), description: nullableText(req.body.description), cost: nullableNumber(req.body.cost), status: req.body.status || "Pending" }; if (!requireFields(res, data.propertyId, data.title)) return; res.status(201).json(await prisma.maintenance.create({ data })); } catch (error) { next(error); } });
app.patch("/api/maintenance/:id", async (req, res, next) => { try { res.json(await prisma.maintenance.update({ where: { id: req.params.id }, data: { status: req.body.status } })); } catch (error) { next(error); } });

app.get("/api/storage", async (req, res, next) => { try { res.json(await prisma.storageFee.findMany({ orderBy: { createdAt: "desc" } })); } catch (error) { next(error); } });
app.post("/api/storage", async (req, res, next) => {
  try { const data = { propertyId: req.body.propertyId, amount: nullableNumber(req.body.amount), month: req.body.month, status: req.body.status || "Pending", description: nullableText(req.body.description) }; if (!requireFields(res, data.propertyId, data.month, data.amount !== null)) return; res.status(201).json(await prisma.storageFee.create({ data })); } catch (error) { next(error); }
});
app.patch("/api/storage/:id", async (req, res, next) => { try { res.json(await prisma.storageFee.update({ where: { id: req.params.id }, data: { status: req.body.status } })); } catch (error) { next(error); } });
app.delete("/api/storage/:id", async (req, res, next) => { try { await prisma.storageFee.delete({ where: { id: req.params.id } }); res.status(204).end(); } catch (error) { next(error); } });

app.get("/api/notifications", async (req, res, next) => { try { res.json(await prisma.notification.findMany({ orderBy: { createdAt: "desc" } })); } catch (error) { next(error); } });
app.patch("/api/notifications/:id", async (req, res, next) => { try { res.json(await prisma.notification.update({ where: { id: req.params.id }, data: { read: Boolean(req.body.read) } })); } catch (error) { next(error); } });

// Health check endpoint
app.get("/api/health", async (req, res, next) => {
  try {
    await prisma.admin.count();
    res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use(errorHandler);

app.get("/", (req, res) => res.json({ success: true, message: "Sakthi Property backend is running" }));
app.listen(PORT, () => console.log(`Sakthi Property API running on port ${PORT}`));
