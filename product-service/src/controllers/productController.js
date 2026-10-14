const mongoose = require("mongoose");
const Product = require("../models/product");

async function getAllProducts(req, res) {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        return res.status(200).json({ products });
    } catch (err) {
        console.error("Error fetching products:", err);
        return res.status(500).json({
            error: "InternalServerError",
            message: "Failed to fetch products"
        });
    }
}

async function getProductById(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "BadRequest",
                message: "Invalid product ID format"
            });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                error: "NotFound",
                message: "Product not found"
            });
        }

        return res.status(200).json({ product });
    } catch (err) {
        console.error("Error fetching product by ID:", err);
        return res.status(500).json({
            error: "InternalServerError",
            message: "Failed to fetch product"
        });
    }
}

async function createProduct(req, res) {
    try {
        const { name, description, price, stock } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({
                error: "ValidationError",
                message: "Product name is required"
            });
        }

        if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
            return res.status(400).json({
                error: "ValidationError",
                message: "A valid non-negative product price is required"
            });
        }

        const product = await Product.create({
            name: name.trim(),
            description: description ? description.trim() : "",
            price: Number(price),
            stock: stock !== undefined && !isNaN(Number(stock)) ? Number(stock) : 0,
            createdBy: req.headers["x-user-id"] || null
        });

        return res.status(201).json({ product });
    } catch (err) {
        console.error("Error creating product:", err);
        return res.status(500).json({
            error: "InternalServerError",
            message: "Failed to create product"
        });
    }
}

async function updateProduct(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "BadRequest",
                message: "Invalid product ID format"
            });
        }

        const updates = {};
        if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
        if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
        if (req.body.price !== undefined) updates.price = Number(req.body.price);
        if (req.body.stock !== undefined) updates.stock = Number(req.body.stock);

        const updated = await Product.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        });

        if (!updated) {
            return res.status(404).json({
                error: "NotFound",
                message: "Product not found"
            });
        }

        return res.status(200).json({ product: updated });
    } catch (err) {
        console.error("Error updating product:", err);
        return res.status(500).json({
            error: "InternalServerError",
            message: "Failed to update product"
        });
    }
}

async function deleteProduct(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "BadRequest",
                message: "Invalid product ID format"
            });
        }

        const deleted = await Product.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({
                error: "NotFound",
                message: "Product not found"
            });
        }

        return res.status(200).json({
            message: "Product deleted successfully"
        });
    } catch (err) {
        console.error("Error deleting product:", err);
        return res.status(500).json({
            error: "InternalServerError",
            message: "Failed to delete product"
        });
    }
}

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};
