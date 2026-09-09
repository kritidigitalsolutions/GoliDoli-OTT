import API from "../../api/axios";

/**
 * Fetch all active categories (user-facing endpoint).
 * Returns: { success, count, data, categories }
 */
export const fetchActiveCategories = async () => {
  const res = await API.get("/categories");
  // Normalise: backend returns both `data` and `categories` keys
  const list = res.data?.categories || res.data?.data || [];
  return {
    success: res.data?.success ?? true,
    count: list.length,
    categories: list,
    data: list,
  };
};

/**
 * Fetch content for a specific category by slug or _id.
 * Returns: { success, category, count, data }
 */
export const fetchCategoryContent = async (slugOrId) => {
  const res = await API.get(`/categories/${slugOrId}`);
  return res.data;
};
