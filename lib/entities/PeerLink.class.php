<?php
namespace lib\entities;

use \lib\Entity;
use \InvalidArgumentException;

class PeerLink extends Entity {
	protected $leftPeer, $rightPeer;

	// SETTERS

	public function setLeftPeer($leftPeer) {
		if (!is_int($leftPeer)) {
			throw new InvalidArgumentException('Invalid peer link peer id "'.$leftPeer.'"');
		}
		if ($leftPeer === $this->rightPeer() && is_int($this->rightPeer())) {
			throw new InvalidArgumentException('Invalid peer link peer id "'.$leftPeer.'": infinite loop');
		}

		$this->leftPeer = $leftPeer;
	}

	public function setRightPeer($rightPeer) {
		if (!is_int($rightPeer)) {
			throw new InvalidArgumentException('Invalid peer link peer id "'.$rightPeer.'"');
		}
		if ($rightPeer === $this->leftPeer() && is_int($this->leftPeer())) {
			throw new InvalidArgumentException('Invalid peer link peer id "'.$leftPeer.'": infinite loop');
		}

		$this->rightPeer = $rightPeer;
	}

	// GETTERS

	public function leftPeer() {
		return $this->leftPeer;
	}

	public function rightPeer() {
		return $this->rightPeer;
	}
}