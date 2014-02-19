<?php
namespace lib\manager;

use \lib\Manager;
use \lib\entities\OfflinePeer;

/**
 * Manage offline peers.
 * A single user can have multiple offline peers for different apps.
 * @author Simon Ser
 * @since 1.0alpha4
 */
abstract class PeerManager extends Manager {
	// GETTERS

	/**
	 * Get peer by id.
	 * @param  int $userId The peer id.
	 * @return OfflinePeer The peer.
	 */
	abstract public function getById($peerId);

	/**
	 * List all peers associated with a specific user.
	 * @param  int $userId The user id.
	 * @return array       A list of peers.
	 */
	abstract public function listByUser($userId);

	// SETTERS

	/**
	 * Insert a new peer.
	 * @param  OfflinePeer $peer The new peer.
	 */
	abstract public function insert(OfflinePeer $peer);

	/**
	 * Update a peer.
	 * @param  OfflinePeer $peer The peer.
	 */
	abstract public function update(OfflinePeer $peer);

	/**
	 * Delete a peer.
	 * @param  int $peerId The peer id.
	 */
	abstract public function delete($peerId);
}