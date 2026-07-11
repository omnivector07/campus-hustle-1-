const Category = require('../models/Category');
const { sendSuccess, sendError } = require('../utils/response');
const { sanitizeText, isNonEmptyString } = require('../utils/validators');

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function listCategories(request, reply) {
  const categories = Category.listActive();
  return sendSuccess(reply, { data: categories });
}

async function listAllCategoriesAdmin(request, reply) {
  const categories = Category.listAll();
  return sendSuccess(reply, { data: categories });
}

async function createCategory(request, reply) {
  const name = sanitizeText(request.body?.name);
  if (!isNonEmptyString(name)) {
    return sendError(reply, { statusCode: 422, message: 'Validation failed.', errors: { name: 'Category name is required.' } });
  }
  const slug = slugify(name);
  const existing = Category.findBySlug(slug);
  if (existing) {
    return sendError(reply, { statusCode: 409, message: 'A category with this name already exists.' });
  }
  const id = Category.create({ name, slug });
  return sendSuccess(reply, { statusCode: 201, message: 'Category created.', data: Category.findById(id) });
}

async function toggleCategory(request, reply) {
  const { id } = request.params;
  const category = Category.findById(id);
  if (!category) {
    return sendError(reply, { statusCode: 404, message: 'Category not found.' });
  }
  Category.setActive(id, !category.is_active);
  return sendSuccess(reply, { message: 'Category updated.', data: Category.findById(id) });
}

async function deleteCategory(request, reply) {
  const { id } = request.params;
  const category = Category.findById(id);
  if (!category) {
    return sendError(reply, { statusCode: 404, message: 'Category not found.' });
  }
  Category.delete(id);
  return sendSuccess(reply, { message: 'Category deleted.' });
}

module.exports = { listCategories, listAllCategoriesAdmin, createCategory, toggleCategory, deleteCategory };
