const { DebtGroup, GroupMember, User } = require('../../models');

const MAX_MEMBERS = 15;
const WARN_MEMBERS = 10;

// ─── Helper: cek apakah req.user adalah member grup ───────────────────────────
const isMember = async (groupId, userId) => {
  return await GroupMember.findOne({ where: { groupId, userId } });
};

const isAdmin = async (groupId, userId) => {
  return await GroupMember.findOne({ where: { groupId, userId, role: 'admin' } });
};

// GET /api/v1/groups — list grup yang diikuti user
exports.listGroups = async (req, res, next) => {
  try {
    const memberships = await GroupMember.findAll({
      where: { userId: req.user.id },
      include: [
        { 
          model: DebtGroup, 
          as: 'group', 
          include: [
            { model: User, as: 'creator', attributes: ['id', 'username'] },
            { model: GroupMember, as: 'members' }
          ] 
        }
      ]
    });
    const groups = memberships.map(m => m.group);
    res.status(200).json({ status: 'success', data: groups });
  } catch (err) { next(err); }
};

// POST /api/v1/groups — buat grup baru
exports.createGroup = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ status: 'fail', message: 'Nama grup wajib diisi.' });

    const group = await DebtGroup.create({ name, description: description || null, createdBy: req.user.id });

    // Creator otomatis jadi admin
    await GroupMember.create({ groupId: group.id, userId: req.user.id, role: 'admin', joinedAt: new Date() });

    res.status(201).json({ status: 'success', data: group });
  } catch (err) { next(err); }
};

// GET /api/v1/groups/:id
exports.getGroup = async (req, res, next) => {
  try {
    const membership = await isMember(req.params.id, req.user.id);
    if (!membership) return res.status(403).json({ status: 'fail', message: 'Kamu bukan anggota grup ini.' });

    const group = await DebtGroup.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username'] },
        { model: GroupMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['id', 'username'] }] }
      ]
    });
    res.status(200).json({ status: 'success', data: group });
  } catch (err) { next(err); }
};

// PATCH /api/v1/groups/:id — update (admin only)
exports.updateGroup = async (req, res, next) => {
  try {
    const admin = await isAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ status: 'fail', message: 'Hanya admin yang bisa mengubah grup.' });

    const group = await DebtGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ status: 'fail', message: 'Grup tidak ditemukan.' });

    const { name, description } = req.body;
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    await group.save();

    res.status(200).json({ status: 'success', data: group });
  } catch (err) { next(err); }
};

// DELETE /api/v1/groups/:id — hapus (admin only)
exports.deleteGroup = async (req, res, next) => {
  try {
    const admin = await isAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ status: 'fail', message: 'Hanya admin yang bisa menghapus grup.' });

    const group = await DebtGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ status: 'fail', message: 'Grup tidak ditemukan.' });

    await group.destroy();
    res.status(200).json({ status: 'success', message: 'Grup berhasil dihapus.' });
  } catch (err) { next(err); }
};

// POST /api/v1/groups/:id/members — tambah member
exports.addMember = async (req, res, next) => {
  try {
    const admin = await isAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ status: 'fail', message: 'Hanya admin yang bisa menambah anggota.' });

    const { username } = req.body;
    if (!username) return res.status(400).json({ status: 'fail', message: 'username wajib diisi.' });

    const targetUser = await User.findOne({ where: { username } });
    if (!targetUser) return res.status(404).json({ status: 'fail', message: `User @${username} tidak ditemukan.` });

    const alreadyMember = await isMember(req.params.id, targetUser.id);
    if (alreadyMember) return res.status(400).json({ status: 'fail', message: 'User sudah menjadi anggota grup ini.' });

    const currentCount = await GroupMember.count({ where: { groupId: req.params.id } });

    // Hard limit: 15 anggota
    if (currentCount >= MAX_MEMBERS) {
      return res.status(400).json({ status: 'fail', message: `Grup sudah penuh. Maksimum ${MAX_MEMBERS} anggota.` });
    }

    const member = await GroupMember.create({ groupId: parseInt(req.params.id), userId: targetUser.id, role: 'member', joinedAt: new Date() });

    const response = { status: 'success', data: member };
    // Soft warning: 10 anggota
    if (currentCount + 1 >= WARN_MEMBERS) {
      response.warning = `Grup hampir penuh (${currentCount + 1}/${MAX_MEMBERS} anggota).`;
    }

    res.status(201).json(response);
  } catch (err) { next(err); }
};

// DELETE /api/v1/groups/:id/members/:userId — kick member (admin only)
exports.removeMember = async (req, res, next) => {
  try {
    const admin = await isAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ status: 'fail', message: 'Hanya admin yang bisa mengeluarkan anggota.' });

    if (parseInt(req.params.userId) === req.user.id) {
      return res.status(400).json({ status: 'fail', message: 'Admin tidak bisa mengeluarkan diri sendiri.' });
    }

    const member = await GroupMember.findOne({ where: { groupId: req.params.id, userId: req.params.userId } });
    if (!member) return res.status(404).json({ status: 'fail', message: 'Anggota tidak ditemukan di grup ini.' });

    await member.destroy();
    res.status(200).json({ status: 'success', message: 'Anggota berhasil dikeluarkan dari grup.' });
  } catch (err) { next(err); }
};
