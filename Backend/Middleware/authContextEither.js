export const protectEither = async (req, res, next) => {
  try {
    // Try user auth
    await protect(req, res, () => {});
    if (req.user) return next();
  } catch (e) {
    // ignore
  }

  try {
    // Try admin auth
    await protectAdmin(req, res, () => {});
    if (req.admin) return next();
  } catch (e) {
    // ignore
  }

  return res.status(401).json({ message: "Not authorized" });
};

export const allowUserOrAdmin = (req, res, next) => {
  if (req.user || req.admin) {
    return next();
  }
  return res.status(401).json({ message: "Not authorized" });
};

