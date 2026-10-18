import express from "express";
import { createContact, getAllContact } from "../controller/contact.controller.js";
import {protect , authorize} from "../middleware/auth.middleware.js"

const contactRoutes = express.Router();

contactRoutes.post("/" , createContact);
contactRoutes.get("/",protect , authorize("admin") , getAllContact);

export default contactRoutes;