<?php
namespace lib;

/**
 * Version represente une version (d'un programme).
 * @author $imon
 * @version 1.0
 */
class Version {
	protected $version;
	protected $fetchedVersion;

	/**
	 * Initialise la version.
	 * @param string $version La version.
	 */
	public function __construct($version) {
		if (!preg_match('#^[0-9\.]+$#',$version))
			throw new InvalidArgumentException('Version incorrecte');
		$this->version = $version;

		$arrayVersion = explode('.',$version);
		foreach ($arrayVersion as $id => $no) {
			$this->fetchedVersion[$id] = (int) $no;
		}
	}

	/**
	 * Retourne la version.
	 * @return string La version.
	 */
	public function getVersion() {
		return $this->version;
	}

	/**
	 * Retourne la version, sous forme de tableau.
	 * @return array La version.
	 */
	public function getFetchedVersion() {
		return $this->fetchedVersion;
	}

	/**
	 * Determine si cette version est plus recente qu'une autre.
	 * @param Version $version La version a comparer.
	 * @return bool Vrai si cette version est plus recente que celle specifiee.
	 */
	public function isNewerThan(Version $version) {
		$otherFetchedVersion = $version->getFetchedVersion();
		foreach ($this->fetchedVersion as $id => $no) {
			if (!array_key_exists($id, $otherFetchedVersion))
				return true;
			elseif ($no == $otherFetchedVersion[$id])
				continue;
			elseif ($no > $otherFetchedVersion[$id])
				return true;
			else
				return false;
		}

		return false;
	}
}