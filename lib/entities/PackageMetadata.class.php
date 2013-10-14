<?php
namespace lib\entities;

abstract class PackageMetadata extends \lib\Entity {
	protected $name, $type, $title, $version, $description, $url, $maintainer, $depends, $updateDate, $categories, $installed, $installDate;

	// SETTERS //
	
	public function setName($name) {
		if (!is_string($name) || empty($name) || !preg_match('#^[a-zA-Z0-9-_.]+$#', $name)) {
			throw new \InvalidArgumentException('Invalid package name "'.$name.'"');
		}

		$this->name = $name;
	}

	public function setType($type) {
		if (!is_string($type) || empty($type)) {
			throw new \InvalidArgumentException('Invalid package type "'.$type.'"');
		}

		$this->type = $type;
	}

	public function setTitle($title) {
		if (!is_string($title) || empty($title)) {
			throw new \InvalidArgumentException('Invalid package title "'.$title.'"');
		}

		$this->title = $title;
	}

	public function setVersion($version) {
		if (!is_string($version) || empty($version)) {
			throw new \InvalidArgumentException('Invalid package version "'.$version.'"');
		}

		$this->version = $version;
	}

	public function setDescription($description) {
		if (!is_string($description) || empty($description)) {
			throw new \InvalidArgumentException('Invalid package description "'.$description.'"');
		}

		$this->description = $description;
	}

	public function setUrl($url) {
		if (!is_string($url) || (!empty($url) && !preg_match('#https?://[a-z0-9._/-?&=%]+#i', $url))) {
			throw new \InvalidArgumentException('Invalid package url "'.$url.'"');
		}

		$this->url = $url;
	}

	public function setMaintainer($maintainer) {
		if (!is_string($maintainer) || empty($maintainer)) {
			throw new \InvalidArgumentException('Invalid package maintainer "'.$maintainer.'"');
		}

		$this->maintainer = $maintainer;
	}

	public function setDepends($depends) {
		if (!is_string($depends) && $depends !== null) {
			throw new \InvalidArgumentException('Invalid package depends "'.$depends.'"');
		}

		$this->depends = $depends;
	}

	public function setUpdateDate($updateDate) {
		if (!is_int($updateDate)) {
			throw new \InvalidArgumentException('Invalid package update date "'.$updateDate.'"');
		}

		$this->updateDate = $updateDate;
	}

	public function setCategories(array $categories) {
		$this->categories = $categories;
	}

	public function setInstalled($isInstalled) {
		if (!is_bool($isInstalled)) {
			throw new \InvalidArgumentException('Invalid package installed value "'.$isInstalled.'"');
		}

		$this->installed = $isInstalled;
	}

	public function setInstallDate($installDate) {
		if (!is_int($installDate)) {
			throw new \InvalidArgumentException('Invalid package install date "'.$installDate.'"');
		}

		$this->installDate = $installDate;
	}

	// GETTERS //

	public function name() {
		return $this->name;
	}

	public function type() {
		return $this->type;
	}

	public function title() {
		return $this->title;
	}

	public function version() {
		return $this->version;
	}

	public function description() {
		return $this->description;
	}

	public function url() {
		return $this->url;
	}

	public function maintainer() {
		return $this->maintainer;
	}

	public function depends() {
		return $this->depends;
	}

	public function updateDate() {
		return $this->updateDate;
	}

	public function categories() {
		return $this->categories;
	}

	public function installed() {
		return $this->installed;
	}

	public function installDate() {
		return $this->installDate;
	}
}