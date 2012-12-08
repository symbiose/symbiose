<?php
namespace lib\models;

use \RuntimeException;

/**
 * FileManager permet de gerer l'ensemble des fichiers.
 * @author $imon
 * @version 1.0
 * @since 1.0 - 24 nov. 2011
 */
class FileManager extends \lib\Manager {
	protected $sizes = array();
	protected $quotas;

	// GETTERS
	/**
	 * Recuperer un fichier.
	 * @param string $path Le chemin vers le fichier.
	 * @return FileBase|bool Le fichier s'il existe, faux sinon.
	 */
	public function get($path) {
		return $this->dao->get($path);
	}

	/**
	 * Determiner si un fichier existe.
	 * @param string $path Le chemin vers le fichier.
	 * @return bool Vrai si le fichier existe.
	 */
	public function exists($path) {
		return $this->dao->exists($path);
	}

	public function getAvailableSpace($path) {
		$cacheFile = '/var/cache/diskusage.json';

		if (empty($this->quotas)) {
			$config = new Config($this->webos);
			$config->load('/etc/quotas.xml');
			$this->quotas['home'] = (int) $config->get('home');
		}

		$usersSizes = null;
		if (count($this->sizes) == 0 && $this->exists($cacheFile)) {
			$usersSizes = json_decode($this->get($cacheFile)->contents(), true);
			if (array_key_exists($this->webos->getUser()->getId(), $usersSizes)) {
				$this->sizes = $usersSizes[$this->webos->getUser()->getId()];
			}
		}

		$paths = array(
			'home' => $this->userDirectory()
		);

		$availableSpace = -1;
		$sizesModified = false;

		foreach($paths as $name => $dirname) {
			if (strpos($path, $dirname) === 0) {
				if ($this->quotas[$name] == -1)
					continue;

				if (!array_key_exists($name, $this->sizes)) {
					if (!$this->exists($dirname))
						continue;
					$dir = $this->get($dirname);
					if (!$dir->isDir())
						continue;
					$this->sizes[$name] = $dir->contentsSize();
					$sizesModified = true;
				}

				$dirAvailableSpace = $this->quotas[$name] - $this->sizes[$name];
				if ($availableSpace == -1 or $dirAvailableSpace < $availableSpace) {
					$availableSpace = $dirAvailableSpace;
				}
			}
		}

		if ($sizesModified) {
			if (!$this->exists($cacheFile)) {
				$cacheFile = $this->createFile($cacheFile);
				if (empty($usersSizes)) {
					$usersSizes = array();
				}
			} else {
				$cacheFile = $this->get($cacheFile);
				if (empty($usersSizes)) {
					$usersSizes = json_decode($cacheFile->contents(), true);
				}
			}

			$usersSizes[$this->webos->getUser()->getId()] = $this->sizes;

			$cacheFile->setContents(json_encode($usersSizes));
		}

		return $availableSpace;
	}

	public function checkAvailableSpace($path, $addedSize) {
		$availableSize = $this->getAvailableSpace($path);

		if ($availableSize == -1) { //Taille illimitee
			return;
		}

		$diff = $availableSize - $addedSize;

		if ($diff < 0) {
			throw new RuntimeException('Trop peu d\'espace est disponible dans le dossier "'.$path.'" (taille manquante : '.$this->bytesToSize(- $diff).')');
		}
	}

	/**
	 * Retourner le chemin vers le dossier personnel de l'utilisateur.
	 * @return string Le chemin du dossier personnel de l'utilisateur.
	 */
	public function userDirectory() {
		return '/home/'.$this->webos->getUser()->getAttribute('username');
	}

	/**
	 * Retourner un dossier temporaire.
	 * @return Folder Le dossier temporaire.
	 */
	public function tmpDir() {
		$path = '/tmp/';
		if (!$this->exists($path)) {
			$this->createDir($path);
		}
		return $this->get($path);
	}

	/**
	 * Convertir une taille en octets vers une taille lisible.
	 * @param int $bytes La taille en octets.
	 * @return string La taille lisible.
	 */
	public function bytesToSize($bytes) {
		if ($bytes == 0 || $bytes == 1)
			return $bytes.' octet';

		$units = array('octets', 'Kio', 'Mio', 'Gio', 'Tio', 'Pio', 'Eio', 'Zio', 'Yio');

		$i = floor(log($bytes) / log(1024));
		return (($i == 0) ? ($bytes / pow(1024, $i))
			: round($bytes / pow(1024, $i), 1)) . ' ' . $units[$i];
	}

	// SETTERS
	/**
	 * Creer un dossier vide.
	 * @param string $path Le chemin vers le nouveau dossier.
	 * @return Folder Le dossier.
	 */
	public function createDir($path) {
		return $this->dao->createDir($path);
	}

	/**
	 * Creer un dossier vide, avec ses dossiers parents.
	 * @param string $path Le chemin vers le nouveau dossier.
	 * @return Folder Le dossier.
	 */
	public function createDirRecursive($path) {
		$dirs = explode('/', $path);

		$pathStack = '';
		foreach($dirs as $dir) {
			if (empty($dir)) {
				continue;
			}

			$pathStack .= $dir . '/';

			if (!$this->exists($pathStack)) {
				$this->createDir($pathStack);
			}
		}

		return $this->get($path);
	}

	/**
	 * Creer un fichier vierge.
	 * @param string $path Le chemin vers le nouveau fichier.
	 * @return File Le fichier.
	 */
	public function createFile($path) {
		return $this->dao->createFile($path);
	}

	/**
	 * Creer un fichier vierge, avec ses dossiers parents.
	 * @param string $path Le chemin vers le nouveau fichier.
	 * @return Folder Le fichier.
	 */
	public function createFileRecursive($path) {
		$dirs = explode('/', $path);
		array_pop($dirs);

		$this->createDirRecursive(implode('/', $dirs));

		return $this->createFile($path);
	}
}