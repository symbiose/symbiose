<?php
namespace lib\entities;

class FirefoxMarketplacePackageMetadata extends PackageMetadata {
	protected $type = 'firefoxMarketplace', $icons;

	// SETTERS //

	public function setType($type) {}

	public function setIcons($icons) {
		$this->icons = $icons;
	}

	// GETTERS //

	public function icons() {
		return $this->icons;
	}
}