<?php
namespace lib\manager;

use \lib\Manager;
use \lib\entities\PeerLink;

/**
 * Manage offline peers links.
 * A peer link is a relationship between two peers.
 * @author Simon Ser
 * @since 1.0alpha4
 */
abstract class PeerLinkManager extends Manager {
	// GETTERS

	/**
	 * Get a peer link by id.
	 * @param  int $linkId The link id.
	 * @return PeerLink    The peer link.
	 */
	abstract public function getById($linkId);

	/**
	 * Get a link between two peers.
	 * @param  int $leftPeerId  The first peer id.
	 * @param  int $rightPeerId The second peer id.
	 * @return PeerLink         The peer link.
	 */
	abstract public function getByPeers($leftPeerId, $rightPeerId);

	/**
	 * List all links associated with a specific peer.
	 * @param  int $peerId The peer id.
	 * @return array       A list of links.
	 */
	abstract public function listByPeer($peerId);

	/**
	 * Check if a link between two peers exists.
	 * @param  int $leftPeerId  The first peer id.
	 * @param  int $rightPeerId The second peer id.
	 * @return bool             True if the link exists, false otherwise.
	 */
	abstract public function existsByPeers($leftPeerId, $rightPeerId);

	/**
	 * Check if a confirmed link between two peers exists.
	 * @param  int $leftPeerId  The first peer id.
	 * @param  int $rightPeerId The second peer id.
	 * @return bool             True if the link exists and is confirmed, false otherwise.
	 */
	abstract public function confirmedByPeers($leftPeerId, $rightPeerId);

	// SETTERS

	/**
	 * Insert a new link.
	 * @param  PeerLink $link The new link.
	 */
	abstract public function insert(PeerLink $link);

	/**
	 * Update a link.
	 * @param  PeerLink $link The link.
	 */
	abstract public function update(PeerLink $link);

	/**
	 * Delete a link.
	 * @param  int $linkId The link id.
	 */
	abstract public function delete($linkId);
}