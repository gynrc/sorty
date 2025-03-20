import Modal from "react-modal";

Modal.setAppElement("#root"); // Prevents accessibility issues

const PlaylistModal = ({ isOpen, onClose, playlistName, tracks }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Playlist Songs"
      className="modal"
      overlayClassName="modal-overlay"
    >
      <button className="close-button" onClick={onClose}>X</button>
      <h2>{playlistName}</h2>
      <ul>
        {tracks.map((track) => (
          <li key={track.id}>
            {track.name} - {track.artist}
          </li>
        ))}
      </ul>
    </Modal>
  );
};

export default PlaylistModal;
