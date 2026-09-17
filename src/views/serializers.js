/**
 * Serialization Layer (View in MVC)
 * Formats API JSON responses and strips sensitive fields like password_hash.
 */

function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles || [],
    oauthProvider: user.oauth_provider || null,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

function serializeGrant(grant) {
  if (!grant) return null;
  return {
    id: grant.id,
    title: grant.title,
    description: grant.description,
    amount: parseFloat(grant.amount),
    grantorId: grant.grantor_id,
    grantorName: grant.grantor_name,
    grantorEmail: grant.grantor_email,
    createdAt: grant.created_at,
    updatedAt: grant.updated_at
  };
}

function serializeApplication(app) {
  if (!app) return null;
  return {
    id: app.id,
    grantId: app.grant_id,
    granteeId: app.grantee_id,
    proposal: app.proposal,
    status: app.status,
    grantTitle: app.grant_title,
    grantorId: app.grantor_id,
    granteeName: app.grantee_name,
    granteeEmail: app.grantee_email,
    createdAt: app.created_at,
    updatedAt: app.updated_at
  };
}

module.exports = {
  serializeUser,
  serializeGrant,
  serializeApplication
};
