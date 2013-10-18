<?php
namespace lib\dao\localfs;

/**
 * A file-based DAO.
 */
class LocalFs {
	const TMP_DIR = '/tmp';

	/**
	 * The file system root path.
	 * @var string
	 */
	protected $root = '';

	/**
	 * An array containing aliases.
	 * @var array
	 */
	protected $aliases = array();

	/**
	 * The current working directory.
	 * @var string
	 */
	protected $currentDir = '';

	public function __construct($root = '.') {
		$this->root = $this->beautifyPath($root);

		$this->setAlias('/', './');
		$this->setCurrentDir('/');
	}

	/**
	 * Get the file system root path.
	 * @return string The root path.
	 */
	public function root() {
		return $this->root;
	}

	/**
	 * Define a new alias.
	 * @param string $key   The alias name.
	 * @param string $value The alias value.
	 */
	public function setAlias($key, $value) {
		$this->aliases[$key] = $value;
	}

	/**
	 * Get registered aliases.
	 * @return array An array containing aliases.
	 */
	public function aliases() {
		return $this->aliases;
	}

	/**
	 * Set the working directory.
	 * @param string $currentDir The path to the directory.
	 */
	public function setCurrentDir($currentDir) {
		$this->currentDir = $currentDir;
	}

	/**
	 * Get the working directory.
	 * @return string The path to the working directory.
	 */
	public function currentDir() {
		return $this->currentDir;
	}

	/**
	 * Beautify a path.
	 * @param  string $path The path to beautify.
	 * @return string       The beautified path.
	 */
	public function beautifyPath($path) {
		$durtyDirs = explode('/', $path);
		$cleanedDirs = array();
		foreach ($durtyDirs as $i => $dir) {
			if ($dir == '..') {
				array_pop($cleanedDirs);
			} elseif ($dir == '.') {
				continue;
			} elseif (empty($dir) && $i > 0) {
				continue;
			} else {
				$cleanedDirs[] = $dir;
			}
		}

		if ($path != '/') {
			$beautifiedPath = implode('/', $cleanedDirs);
		}
		if (empty($beautifiedPath)) {
			$beautifiedPath = (substr($path, 0, 1) == '/') ? '/' : '.';
		}

		return $beautifiedPath;
	}

	/**
	 * Convert an external path to an internal path.
	 * @param  string $externalPath The external path.
	 * @return string               The internal path.
	 */
	public function toInternalPath($externalPath) {
		$internalPath = $externalPath;

		if (preg_match('#^(\.)+/#', $internalPath)) { //Replace relative paths
			$internalPath = $this->currentDir() . '/' . $internalPath;
		}

		//Aliases
		$nbrTurns = 0; //Protection against infinite loops
		do {
			$appliedAliasesNbr = 0;

			foreach ($this->aliases as $key => $value) {
				if (substr($internalPath, 0, strlen($key)) == $key) {
					$internalPath = $value . substr($internalPath, strlen($key));
					$appliedAliasesNbr++;
				}
			}

			$nbrTurns++;
		} while($appliedAliasesNbr > 0 && $nbrTurns <= count($this->aliases));

		//Prepend the root path
		$rootPath = $this->root();
		if (!empty($rootPath)) {
			$internalPath = $rootPath . '/' . $internalPath;
		}

		return $this->beautifyPath($internalPath);
	}

	/**
	 * Convert an internal path to an external path.
	 * @param  string $internalPath The internal path.
	 * @return string               The external path.
	 */
	public function toExternalPath($internalPath) {
		$externalPath = $internalPath;

		//Remove the root path
		if (substr($externalPath, 0, strlen($this->root())) == $this->root()) {
			$externalPath = substr($externalPath, strlen($this->root()));
		}

		//Aliases
		$nbrTurns = 0; //Protection against infinite loops
		do {
			$appliedAliasesNbr = 0;

			foreach ($this->aliases as $key => $value) {
				if (substr($externalPath, 0, strlen($value)) == $value) {
					$externalPath = $key . substr($externalPath, strlen($value));
					$appliedAliasesNbr++;
				}
			}

			$nbrTurns++;
		} while($appliedAliasesNbr > 0 && $nbrTurns <= count($this->aliases));

		return $this->beautifyPath($externalPath);
	}

	/**
	 * Check if a file exists.
	 * @param  string $path The file path.
	 * @return boolean      True if the file exists, false otherwise.
	 */
	public function exists($path) {
		return file_exists($this->toInternalPath($path));
	}

	/**
	 * Check if a file is a directory.
	 * @param  string  $path The file path.
	 * @return boolean       True if the file is a directory, false otherwise.
	 */
	public function isDir($path) {
		return is_dir($this->toInternalPath($path));
	}

	public function pathinfo($path, $option) {
		switch($option) {
			case PATHINFO_DIRNAME:
				return $this->dirname($path);
			default:
				return pathinfo($this->toInternalPath($path), $option);
		}
	}

	/**
	 * Get a file's parent directory path.
	 * @param  string $path The file path.
	 * @return string       The parent directory path.
	 */
	public function dirname($path) {
		$path = $this->beautifyPath($path);

		if (strpos($path, '/', 1) !== false) {
			$dirname = preg_replace('#/[^/]*/?$#', '', $path);
		} else if (strpos($path, '/') === 0) {
			$dirname = '/';
		} else {
			$dirname = null;
		}

		return $dirname;
	}

	/**
	 * Get a file's basename (filename with its extension).
	 * @param  string $path The file path.
	 * @return string       The file's basename.
	 */
	public function basename($path) {
		return $this->pathinfo($path, PATHINFO_BASENAME);
	}

	/**
	 * Get a file's extension.
	 * @param  string $path The file path.
	 * @return string       The file's extension.
	 */
	public function extension($path) {
		return $this->pathinfo($path, PATHINFO_EXTENSION);
	}

	/**
	 * Get a file's size.
	 * @param  string  $path      The file path.
	 * @param  boolean $recursive If set to true and the file is a directory, returns the directory's content size (sum of all contained files).
	 * @return int                The file's size.
	 */
	public function size($path, $recursive = false) {
		if ($this->isDir($path) && $recursive) {
			$totalSize = 0;
			$files = $this->readDir($path);

			foreach ($files as $filepath) {
				$totalSize += $this->size($filepath, true);
			}

			return $totalSize;
		} else {
			return filesize($this->toInternalPath($path));
		}
	}

	/**
	 * Get a file's MIME type.
	 * @param  string $path The file's path.
	 * @return string       The MIME type.
	 */
	public function mimetype($path) {
		$fileExtension = $this->extension($path);

		switch ($fileExtension) { //Some vital mime types for the webos
			case 'css':
				return 'text/css';
			case 'js':
				return 'text/javascript';
			case 'html':
				return 'text/html';
		}

		$htaccessPath = '/.htaccess'; //Parse .htaccess file and search for custom mime types
		if ($this->exists($htaccessPath)) {
			$contents = $this->read($htaccessPath);
			$lines = explode("\n", $contents);

			foreach ($lines as $line) {
				$line = trim($line);
				if (stripos($line, 'AddType ') === 0) {
					$data = explode(' ', $line);
					if ($data[2] == $fileExtension) {
						return $data[1];
					}
				}
			}
		}

		//Try to determinate the mime type using finfo
		if (!class_exists('finfo')) {
			return 'application/octet-stream';
		}
		$finfo = new \finfo(FILEINFO_MIME);
		if (!$finfo) { //Error while opening finfo db
			return 'application/octet-stream';
		}
		return $finfo->file($this->toInternalPath($path));
	}

	/**
	 * Check if a file is a binary file.
	 * @param  string  $path The file path.
	 * @return boolean       True if the file is a binary file, false otherwise.
	 */
	public function isBinary($path) {
		$mime = $this->mimetype($path);
		return (substr($mime, 0, 5) != 'text/');
	}

	/**
	 * Get a file's last access time.
	 * @param  string $path The file path.
	 * @return int          The file's last access time.
	 */
	public function atime($path) {
		return fileatime($this->toInternalPath($path));
	}

	/**
	 * Get a file's last modification time.
	 * @param  string $path The file path.
	 * @return int          The file's last modification time.
	 */
	public function mtime($path) {
		return filemtime($this->toInternalPath($path));
	}

	/**
	 * Write some contents into a file.
	 * @param  string $path     The file path.
	 * @param  string $contents The contents to write.
	 */
	public function write($path, $contents) {
		if (file_put_contents($this->toInternalPath($path), $contents) === false) {
			throw new \RuntimeException('Cannot write into file "'.$path.'"');
		}
	}

	/**
	 * Create a new directory.
	 * @param  string  $path      The new directory path.
	 * @param  boolean $recursive If set to true, will also create parent directories if they don't exist.
	 */
	public function mkdir($path, $recursive = false) {
		$internalPath = $this->toInternalPath($path);
		if (mkdir($internalPath, 0777, $recursive) === false) {
			throw new \RuntimeException('Cannot create directory "'.$path.'"');
		}

		chmod($internalPath, 0777); //Sometimes, the directory is created without the right mode.
	}

	/**
	 * Create a new file.
	 * @param  string  $path             The new file path.
	 * @param  boolean $createParentDirs If set to true, will also create parent directories if they don't exist.
	 */
	public function createFile($path, $createParentDirs = false) {
		$parentDirPath = $this->dirname($path);
		if (!$this->exists($parentDirPath)) {
			if ($createParentDirs) {
				$this->mkdir($parentDirPath, true);
			} else {
				throw new \RuntimeException('Cannot create file "'.$path.'" (parent directory "'.$parentDirPath.'" doesn\'t exist)');
			}
		}

		$internalPath = $this->toInternalPath($path);

		if (touch($internalPath) === false) {
			throw new \RuntimeException('Cannot create file "'.$path.'"');
		}

		chmod($internalPath, 0777);
	}

	/**
	 * Read a file's contents.
	 * @param  string $path The file path.
	 * @return string       The file's contents.
	 */
	public function read($path) {
		$contents = file_get_contents($this->toInternalPath($path));

		if ($contents === false) {
			throw new \RuntimeException('Cannot read file "'.$path.'"');
		}

		return $contents;
	}

	/**
	 * Read a directory's contents.
	 * @param  string  $path      The directory path.
	 * @param  boolean $recursive If set to true, reads recursively the directory.
	 * @return array              A list of files contained in the given directory.
	 */
	public function readDir($path, $recursive = false) {
		$handle = opendir($this->toInternalPath($path)); //Open dir

		if ($handle === false) {
			throw new \RuntimeException('Cannot read directory "'.$path.'"');
		}

		$list = array(); //Files list

		while (($file = readdir($handle)) !== false) { //For each file
			if ($file == '.' || $file == '..') { //Ignore these
				continue;
			}

			$filepath = $this->beautifyPath($path.'/'.$file); //Path to file
			$list[$file] = $filepath;

			if ($recursive && $this->isDir($filepath)) {
				$subfiles = $this->readDir($filepath, $recursive);
				foreach($subfiles as $subfilename => $subfilepath) {
					$list[$file.'/'.$subfilename] = $subfilepath;
				}
			}
		}

		closedir($handle);

		ksort($list); //Sort files

		return $list;
	}

	/**
	 * Delete a file.
	 * @param  string  $path      The file path.
	 * @param  boolean $recursive If set to true and the file is a directory, will also delete the directory's files.
	 */
	public function delete($path, $recursive = false) {
		$internalPath = $this->toInternalPath($path);

		if (is_dir($internalPath)) {
			if ($recursive) {
				$filesToDelete = $this->readDir($path);

				foreach ($filesToDelete as $filepath) {
					$this->delete($filepath, $recursive);
				}
			}
			
			if (rmdir($internalPath) === false) {
				throw new \RuntimeException('Cannot delete directory "'.$path.'"');
			}
		} else {
			if (unlink($internalPath) === false) {
				throw new \RuntimeException('Cannot delete file "'.$path.'"');
			}
		}
	}

	/**
	 * Copy a file.
	 * @param  string  $source    The source path.
	 * @param  string  $dest      The destination path.
	 * @param  boolean $recursive If set to true and the file is a directory, the directory's contents will also be copied.
	 */
	public function copy($source, $dest, $recursive = false) {
		$destDirname = $this->dirname($dest);
		if (!$this->exists($destDirname)) { //If the destination parent directory doesn't exist
			throw new \RuntimeException('Cannot copy file from "'.$source.'" to "'.$dest.'" : destination directory "'.$destDirname.'" doesn\'t exist');
		}

		$sourceInternalPath = $this->toInternalPath($source);
		$destInternalPath = $this->toInternalPath($dest);

		if (!is_dir($sourceInternalPath)) { //Copy a file
			if (copy($sourceInternalPath, $destInternalPath) === false) {
				throw new \RuntimeException('Cannot copy file from "'.$source.'" to "'.$dest.'"');
			}
		} else { //Copy a directory
			if (!$this->isDir($dest)) { //If the destination directory doesn't exist, create it
				$this->mkdir($dest);
			}

			if ($recursive) { //Recursive copy
				$subfiles = $this->readDir($source); //List files in teh source folder and copy them
				foreach ($subfiles as $subfilename => $subfilepath) {
					$this->copy($source.'/'.$subfilename, $dest.'/'.$subfilename, true);
				}
			}
		}

		return $dest;
	}

	/**
	 * Move a file.
	 * @param  string $source The source path.
	 * @param  string $dest   The destination path.
	 */
	public function move($source, $dest) {
		$destDirname = $this->dirname($dest);
		if (!$this->exists($destDirname)) { //If the destination parent directory doesn't exist
			throw new \RuntimeException('Cannot move file from "'.$source.'" to "'.$dest.'" : destination directory "'.$destDirname.'" doesn\'t exist');
		}

		$sourceInternalPath = $this->toInternalPath($source);
		$destInternalPath = $this->toInternalPath($dest);

		if (!rename($sourceInternalPath, $destInternalPath)) {
			throw new \RuntimeException('Cannot move file from "'.$source.'" to "'.$dest.'"');
		}

		return $dest;
	}

	/**
	 * Create a new temporary file.
	 * @return string The temporary file path.
	 */
	public function tmpfile() {
		$tmpDir = self::TMP_DIR;

		if (!$this->isDir($tmpDir)) {
			$this->mkdir($tmpDir);
		}

		$tmpFile = tempnam($tmpDir, 'tmp');

		$fileManager = $this;
		$currentDir = getcwd();
		register_shutdown_function(function() use ($tmpFile, $fileManager, $currentDir) {
			chdir($currentDir);

			if ($fileManager->exists($tmpFile)) {
				$fileManager->delete($tmpFile, true);
			}
		});

		return $tmpFile;
	}
}