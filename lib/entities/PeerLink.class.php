<?php
namespace lib\entities;

use \lib\Entity;
use \InvalidArgumentException;

class PeerLink extends Entity {
	protected $leftPeer, $rightPeer, $confirmed;

	// SETTERS

	public function setLeftPeer($leftPeer) { //Link requester
		if (!is_int($leftPeer)) {
			throw new InvalidArgumentException('Invalid peer link peer id "'.$leftPeer.'"');
		}
		if ($leftPeer === $this->rightPeer() && is_int($this->rightPeer())) {
			throw new InvalidArgumentException('Invalid peer link peer id "'.$leftPeer.'": infinite loop');
		}

		$this->leftPeer = $leftPeer;
	}

	public function setRightPeer($rightPeer) { //Link confirmer
		if (!is_int($rightPeer)) {
			throw new InvalidArgumentException('Invalid peer link peer id "'.$rightPeer.'"');
		}
		if ($rightPeer === $this->leftPeer() && is_int($this->leftPeer())) {
			throw new InvalidArgumentException('Invalid peer link peer id "'.$leftPeer.'": infinite loop');
		}

		$this->rightPeer = $rightPeer;
	}

	public function setConfirmed($confirmed) {
		if (!is_bool($confirmed)) {
			throw new InvalidArgumentException('Invalid peer link confirmed value "'.$confirmed.'"');
		}

		$this->confirmed = $confirmed;
	}

	// GETTERS

	public function leftPeer() {
		return $this->leftPeer;
	}

	public function rightPeer() {
		return $this->rightPeer;
	}

	public function confirmed() {
		return ($this->confirmed) ? true : false;
	}
}