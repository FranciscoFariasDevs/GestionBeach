// Singleton para compartir el objeto io con jobs/services sin necesitar req
let _io = null;
module.exports = {
  setIO: (io) => { _io = io; },
  getIO: () => _io,
};
