const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        price: {
            type: Number,
            required: [true, "Product price is required"],
            min: [0, "Price cannot be negative"]
        },
        stock: {
            type: Number,
            default: 0,
            min: [0, "Stock cannot be negative"]
        },
        createdBy: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
