<?php
namespace lib\manager;

class FileManager_localfs extends FileManager {
	const DISKUSAGE_QUOTAS_FILE = '/etc/quotas.json';
	const DISKUSAGE_CACHE_FILE = '/var/cache/diskusage.json';

	protected $diskusage = array();
	protected $quotas;

	protected function _getQuotasConfig() {
		return $this->openConfig(self::DISKUSAGE_QUOTAS_FILE);
	}

	protected function _getDiskusageCache() {
		return $this->openConfig(self::DISKUSAGE_CACHE_FILE);
	}

	// GETTERS

	public function availableSpace($path) {
		$isUserLogged = false;
		$username = '';

		$aliases = $this->dao->aliases();
		if (isset($aliases['~'])) {
			$isUserLogged = true;
			$username = $_SESSION['user_data_username']; //TODO: better way to retrieve the username
		}

		if (empty($this->quotas)) {
			$configFile = $this->_getQuotasConfig();
			$quotasData = $configFile->read();
			
			$userQuotas = array();
			if ($isUserLogged) {
				if (isset($quotasData['specific']) && isset($quotasData['specific'][$username])) {
					$userQuotas = $quotasData['specific'][$username];
				}
			}

			if (empty($userQuotas)) {
				if (!isset($quotasData['global'])) {
					$quotasData['global'] = array('~' => -1);
				}

				$userQuotas = $quotasData['global'];
			}

			$this->quotas = $userQuotas;
		}

		$cacheFile = $this->_getDiskusageCache();
		$globalDiskusage = array();
		$userDiskusage = array();
		if (empty($this->diskusage)) {
			$globalDiskusage = $cacheFile->read();
			if (isset($globalDiskusage['global'])) {
				$this->diskusage = $globalDiskusage['global'];
			}
			if ($isUserLogged && isset($globalDiskusage['specific']) && isset($globalDiskusage['specific'][$username])) {
				$userDiskusage = $globalDiskusage['specific'][$username];
				$this->diskusage = array_merge($this->diskusage, $userDiskusage);
			}
		}

		$availableSpace = false;
		$sizesModified = false;

		foreach($this->quotas as $dirname => $quota) {
			if ($quota < 0) {
				continue;
			}

			if (strpos($path, $dirname.'/') === 0 || $path == $dirname) {
				if (!isset($this->diskusage[$dirname])) {
					if (!$this->exists($dirname) || !$this->isDir($dirname)) {
						continue;
					}

					$this->diskusage[$dirname] = $this->size($dirname, true);

					if ($isUserLogged) {
						$userDiskusage[$dirname] = $this->diskusage[$dirname];
					}

					$sizesModified = true;
				}

				$dirAvailableSpace = $this->quotas[$dirname] - $this->diskusage[$dirname];
				if ($availableSpace === false || $dirAvailableSpace < $availableSpace) {
					$availableSpace = $dirAvailableSpace;
				}
			}
		}

		if ($availableSpace === false) {
			$availableSpace = -1;
		}

		if ($sizesModified) {
			if (empty($globalDiskusage)) {
				$globalDiskusage = $cacheFile->read();
			}

			if ($isUserLogged) {
				if (!isset($globalDiskusage['specific'])) {
					$globalDiskusage['specific'] = array();
				}
				$globalDiskusage['specific'][$username] = $userDiskusage;
			}

			$cacheFile->write($globalDiskusage);
		}

		return $availableSpace;
	}

	public function checkAvailableSpace($path, $addedSize) {
		if ($addedSize < 0) {
			return;
		}

		$availableSize = $this->availableSpace($path);

		if ($availableSize == -1) { //No quota
			return;
		}

		$diff = $availableSize - $addedSize;

		if ($diff < 0) {
			throw new \RuntimeException('No more space available in "'.$path.'" (missing size : '.$this->bytesToSize(- $diff).', available size : '.$this->bytesToSize($availableSize).')');
		}
	}

	public function beautifyPath($path) {
		return $this->dao()->beautifyPath($path);
	}

	public function toInternalPath($path) {
		return $this->dao()->toInternalPath($path);
	}

	public function toExternalPath($path) {
		return $this->dao()->toExternalPath($path);
	}

	public function exists($path) {
		return $this->dao()->exists($path);
	}

	public function isDir($path) {
		return $this->dao()->isDir($path);
	}

	public function pathinfo($path, $option) {
		return $this->dao()->pathinfo($path, $option);
	}

	public function dirname($path) {
		return $this->dao()->dirname($path);
	}

	public function basename($path) {
		return $this->dao()->basename($path);
	}

	public function extension($path) {
		return $this->dao()->extension($path);
	}

	public function size($path, $recursive = false) {
		return $this->dao()->size($path, $recursive);
	}

	public function mimetype($path) {
		return $this->dao()->mimetype($path);
	}

	public function isBinary($path) {
		return $this->dao()->isBinary($path);
	}

	public function atime($path) {
		return $this->dao()->atime($path);
	}

	public function mtime($path) {
		return $this->dao()->mtime($path);
	}

	public function read($path) {
		return $this->dao()->read($path);
	}

	public function readDir($path, $recursive = false) {
		return $this->dao()->readDir($path, $recursive);
	}

	/**
	 * Convert bytes to a human-readable size.
	 * @param  int    $bytes The size in bytes.
	 * @return string        The human-readable size.
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

	public function write($path, $contents) {
		$newSize = strlen($contents);
		if ($this->exists($path) && !$this->isDir($path)) {
			$this->checkAvailableSpace($path, $newSize - $this->size($path));
		} else {
			$this->checkAvailableSpace($path, $newSize);
		}

		return $this->dao()->write($path, $contents);
	}

	public function mkdir($path, $recursive = false) {
		return $this->dao()->mkdir($path, $recursive);
	}

	public function createFile($path, $createParentDirs = false) {
		return $this->dao()->createFile($path, $createParentDirs);
	}

	public function delete($path, $recursive = false) {
		return $this->dao()->delete($path, $recursive);
	}

	public function copy($source, $dest, $recursive = false) {
		$sourceSize = $this->size($source, true);
		$this->checkAvailableSpace($dest, $sourceSize);

		return $this->dao()->copy($source, $dest, $recursive);
	}

	public function move($source, $dest) {
		$sourceSize = $this->size($source, true);
		$this->checkAvailableSpace($dest, $sourceSize);

		return $this->dao()->move($source, $dest);
	}

	public function tmpfile() {
		return $this->dao()->tmpfile();
	}

	/**
	 * Open a configuration file.
	 * @param  string $path The configuration file path.
	 * @return Config       The configuration file.
	 */
	public function openConfig($path) {
		$internalPath = $this->dao->toInternalPath($path);
		switch ($this->dao->extension($path)) {
			case 'json':
				return new \lib\JsonConfig($internalPath);
			case 'xml':
				return new \lib\XmlConfig($internalPath);
			default:
				throw new \RuntimeException('Cannot open configuration file "'.$path.'" : not a JSON or XML file');
		}
	}
}