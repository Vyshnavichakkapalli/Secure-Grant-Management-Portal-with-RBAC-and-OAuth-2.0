const RoleModel = require('../../src/models/role.model');
const UserModel = require('../../src/models/user.model');
const GrantModel = require('../../src/models/grant.model');
const ApplicationModel = require('../../src/models/application.model');
const { resetAndSeedDb } = require('../helpers');

describe('Data Models Direct Unit Tests', () => {
  beforeEach(async () => {
    await resetAndSeedDb();
  });

  describe('RoleModel', () => {
    test('findAll should return array of roles', async () => {
      const roles = await RoleModel.findAll();
      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThanOrEqual(3);
    });

    test('findByName should find role case-insensitively', async () => {
      const role = await RoleModel.findByName('admin');
      expect(role).toBeDefined();
      expect(role.name).toBe('ADMIN');
    });

    test('findById should return role by ID', async () => {
      const all = await RoleModel.findAll();
      const role = await RoleModel.findById(all[0].id);
      expect(role).toBeDefined();
      expect(role.id).toBe(all[0].id);
    });

    test('create should create custom role', async () => {
      const newRole = await RoleModel.create('REVIEWER');
      expect(newRole).toBeDefined();
      expect(newRole.name).toBe('REVIEWER');
    });
  });

  describe('UserModel', () => {
    test('removeRole should remove role from user', async () => {
      const user = await UserModel.create({
        name: 'Role Test User',
        email: 'roletest@example.com'
      });
      const role = await RoleModel.findByName('GRANTEE');
      await UserModel.assignRole(user.id, role.id);

      let roles = await UserModel.getUserRoles(user.id);
      expect(roles).toContain('GRANTEE');

      await UserModel.removeRole(user.id, role.id);
      roles = await UserModel.getUserRoles(user.id);
      expect(roles).not.toContain('GRANTEE');
    });

    test('findWithRolesById returns null for unknown user', async () => {
      const user = await UserModel.findWithRolesById('00000000-0000-0000-0000-000000000000');
      expect(user).toBeNull();
    });

    test('findWithRolesByEmail returns null for unknown email', async () => {
      const user = await UserModel.findWithRolesByEmail('unknown@example.com');
      expect(user).toBeNull();
    });
  });

  describe('GrantModel', () => {
    test('findByGrantorId returns list of grants by grantor', async () => {
      const user = await UserModel.create({
        name: 'Grantor Model User',
        email: 'grantormodel@example.com'
      });

      await GrantModel.create({
        title: 'Grant 1',
        description: 'Desc 1',
        amount: 10000,
        grantorId: user.id
      });

      await GrantModel.create({
        title: 'Grant 2',
        description: 'Desc 2',
        amount: 20000,
        grantorId: user.id
      });

      const list = await GrantModel.findByGrantorId(user.id);
      expect(list.length).toBe(2);
    });

    test('update should return null if grant does not exist', async () => {
      const res = await GrantModel.update('00000000-0000-0000-0000-000000000000', {
        title: 'Non-existent'
      });
      expect(res).toBeNull();
    });
  });

  describe('ApplicationModel', () => {
    test('findByGranteeId returns applications submitted by grantee', async () => {
      const grantor = await UserModel.create({
        name: 'Grantor',
        email: 'gm@example.com'
      });
      const grantee = await UserModel.create({
        name: 'Grantee',
        email: 'ge@example.com'
      });

      const grant = await GrantModel.create({
        title: 'Title',
        description: 'Desc',
        amount: 5000,
        grantorId: grantor.id
      });

      await ApplicationModel.create({
        grantId: grant.id,
        granteeId: grantee.id,
        proposal: 'Proposal content'
      });

      const list = await ApplicationModel.findByGranteeId(grantee.id);
      expect(list.length).toBe(1);
      expect(list[0].proposal).toBe('Proposal content');
    });

    test('updateStatus updates status of application', async () => {
      const grantor = await UserModel.create({
        name: 'Grantor 2',
        email: 'gm2@example.com'
      });
      const grantee = await UserModel.create({
        name: 'Grantee 2',
        email: 'ge2@example.com'
      });

      const grant = await GrantModel.create({
        title: 'Title 2',
        description: 'Desc 2',
        amount: 8000,
        grantorId: grantor.id
      });

      const app = await ApplicationModel.create({
        grantId: grant.id,
        granteeId: grantee.id,
        proposal: 'Proposal 2'
      });

      const updated = await ApplicationModel.updateStatus(app.id, 'approved');
      expect(updated.status).toBe('approved');
    });
  });
});
