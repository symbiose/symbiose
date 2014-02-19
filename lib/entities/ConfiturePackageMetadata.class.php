<?php
namespace lib\entities;

class ConfiturePackageMetadata extends PackageMetadata {
	protected $type = 'confiture', $repository, $subtitle, $license, $size, $extractedSize, $hasScripts;

	// SETTERS //

	public function setType($type) {}

	public function setRepository($repoName) {
		if (!is_string($repoName) || empty($repoName)) {
			throw new \InvalidArgumentException('Invalid package repository');
		}

		$this->repository = $repoName;
	}

	public function setSubtitle($subtitle) {
		if (!is_string($subtitle)) {
			throw new \InvalidArgumentException('Invalid package subtitle');
		}

		$this->subtitle = $subtitle;
	}

	public function setLicense($license) {
		if (!is_string($license) || empty($license)) {
			throw new \InvalidArgumentException('Invalid package license');
		}

		$this->license = $license;
	}

	public function setSize($size) {
		if (!is_int($size) || $size < 0) {
			throw new \InvalidArgumentException('Invalid package size');
		}

		$this->size = $size;
	}

	public function setExtractedSize($extractedSize) {
		if (!is_int($extractedSize) || $extractedSize < 0) {
			throw new \InvalidArgumentException('Invalid package extracted size');
		}

		$this->extractedSize = $extractedSize;
	}

	public function setHasScripts($hasScripts) {
		if (!is_bool($hasScripts)) {
			throw new \InvalidArgumentException('Invalid package scripts indicator');
		}

		$this->hasScripts = $hasScripts;
	}

	// GETTERS //

	public function repository() {
		return $this->repository;
	}

	public function subtitle() {
		return $this->subtitle;
	}

	public function license() {
		return $this->license;
	}

	public function size() {
		return $this->size;
	}

	public function extractedSize() {
		return $this->extractedSize;
	}

	public function hasScripts() {
		return $this->hasScripts;
	}
}