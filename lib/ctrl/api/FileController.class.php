<?php
namespace lib\ctrl\api;

use ZipArchive;
use Wrappers\FtpStream;
use Wrappers\FtpsStream;
use Wrappers\SftpStream;
use lib\ApiBackController;
use lib\entities\FileMetadata;
use lib\entities\FileShare;

// Register stream wrappers
FtpStream::register();
FtpsStream::register();
SftpStream::register();

/**
 * Manage files.
 * @author emersion
 */
class FileController extends ApiBackController {
	const UPLOADS_CONFIG = '/etc/uploads.json';

	protected function getPathData($path) {
		$manager = $this->managers()->getManagerOf('file');

		$data = array(
			'basename' => $manager->basename($path),
			'path' => $path,
			'realpath' => $manager->toInternalPath($path),
			'dirname' => $manager->dirname($path)
		);

		return $data;
	}

	protected function createFileMetadata($path) {
		$manager = $this->managers()->getManagerOf('file');
		$metadataManager = $this->managers()->getManagerOf('fileMetadata');

		$internalPath = $manager->toInternalPath($path);
		$fileMetadata = $metadataManager->getByPath($internalPath);
		if (empty($fileMetadata)) {
			$closestParent = $metadataManager->getFirstParent($internalPath);

			$closestParentId = null;
			if (!empty($closestParent)) {
				$closestParentId = $closestParent['id'];
			}

			$data = array(
				'path' => $internalPath,
				'parent' => $closestParentId
			);

			$fileMetadata = new FileMetadata($data);

			$metadataManager->insert($fileMetadata);
		}

		return $fileMetadata;
	}

	protected function getShareUrl($path, $key) {
		$manager = $this->managers()->getManagerOf('file');

		$shareUrl = $manager->toInternalPath($path) . '?key=' . $key;

		if ($manager->isDir($path)) {
			$shareUrl .= '&dl=1';
		}

		return $shareUrl;
	}

	protected function getFileShareData($path, FileShare $share) {
		return array(
			'type' => 'link',
			'url' => $this->getShareUrl($path, $share['key']),
			'date' => $share['date'],
			'ttl' => $share['ttl']
		);
	}

	/**
	 * Get a file's content.
	 * @param  string $path The file path.
	 * @return string       The file's content.
	 */
	public function executeGetContents($path) {
		$manager = $this->managers()->getManagerOf('file');

		if (!$manager->exists($path)) {
			throw new \RuntimeException('"'.$path.'": no such file or directory', 404);
		}

		if ($manager->isDir($path)) {
			$files = $manager->readDir($path);

			$list = array();
			foreach($files as $filepath) {
				try {
					$list[$manager->removeHostFromPath($filepath)] = $this->executeGetMetadata($filepath);
				} catch (\Exception $e) {
					continue;
				}
			}

			return $list;
		} else {
			$contents = $manager->read($path);

			if (strpos($path, '/home/') !== 0 && strpos($path, '/etc/') !== 0) { //File is not in /home or in /etc
				$this->responseContent->setCacheable(true);
			}

			return $contents;
		}
	}

	/**
	 * Get a file's content, base64-encoded.
	 * @param  string $path The file path.
	 * @return string       The file's content, base64-encoded.
	 */
	public function executeGetAsBinary($path) {
		$manager = $this->managers()->getManagerOf('file');

		if ($manager->isDir($path)) {
			throw new \RuntimeException('"'.$path.'": is a directory (tried to open it as a binary file)', 405);
		}

		$contents = $this->executeGetContents($path);
		return base64_encode($contents);
	}

	/**
	 * Get a file's content, minified.
	 * @param  string $path The file path.
	 * @return string       The file's content, minified.
	 * @deprecated
	 */
	public function executeGetMinified($path) {
		$manager = $this->managers()->getManagerOf('file');

		if ($manager->isDir($path)) {
			throw new \RuntimeException('"'.$path.'": is a directory (tried to open it as a minified file)', 405);
		}

		$out = $this->executeGetContents($path);

		if ($manager->extension($manager->filename($path)) != 'min' && false) {
			$ext = $manager->extension($path);
			switch ($ext) {
				case 'js':
					$out = \JSMinPlus::minify($out);
					break;
				case 'css':
					$minifier = new \CssMin();
					$out = $minifier->minify($out);
					break;
				default:
					throw new \RuntimeException('Cannot minify "'.$path.'": unsupported file type', 406);
			}
		}

		$this->responseContent->setChannel(1, $out);
	}

	/**
	 * Get a file's metadata.
	 * @param  string $path The file's path.
	 * @return array        The file's metadata.
	 */
	public function executeGetMetadata($path) {
		$manager = $this->managers()->getManagerOf('file');
		$metadataManager = $this->managers()->getManagerOf('fileMetadata');
		$shareManager = $this->managers()->getManagerOf('fileShare');
		$user = $this->app()->user();

		if (!$manager->isRemote($path) && !$manager->exists($path)) {
			throw new \RuntimeException('"'.$path.'": no such file or directory', 404);
		}

		$baseData = $this->getPathData($manager->removeHostFromPath($path));

		$data = array_merge($baseData, array(
			'is_dir' => $manager->isDir($path)
		));

		if (!$data['is_dir']) {
			$data['extension'] = $manager->extension($path);
			$data['size'] = $manager->size($path);
		}

		if (!$manager->isRemote($path)) {
			$data = array_merge($data, array(
				'atime' => $manager->atime($path),
				'mtime' => $manager->mtime($path),
				'mime_type' => $manager->mimetype($path),
				'download_url' => $manager->toInternalPath($path) . '?dl=1'
			));

			if ($data['is_dir']) {
				$data['available_space'] = $manager->availableSpace($path);
				$data['size'] = count($manager->readDir($path));
			}

			$internalPath = $manager->toInternalPath($path);
			if ($metadataManager->pathExists($internalPath)) {
				$fileMetadata = $metadataManager->getByPath($internalPath);

				$owner = $fileMetadata['owner'];
				if ($owner === null) {
					if ($path == '~' || substr($path, 0, 2) == '~/') {
						$owner = $user->id();
					}
				}

				$data = array_merge($data, array(
					'id' => $fileMetadata['id'],
					'tags' => $fileMetadata['tags'],
					'parent' => $fileMetadata['parent'],
					'owner' => $owner
				));

				if ($shareManager->fileIdExists($fileMetadata['id'])) {
					$shares = $shareManager->listByFileId($fileMetadata['id']);

					$data['labels']['shared'] = true;
					$data['shares'] = array();

					foreach ($shares as $share) {
						$data['shares'][] = $this->getFileShareData($path, $share);
					}
				}
			}
		}

		return $data;
	}

	/**
	 * Get a file's metadata.
	 * @param  string $path The file's path.
	 * @return array        The file's metadata.
	 * @deprecated Use `executeGetMetadata()` instead.
	 */
	public function executeGetData($path) {
		return $this->executeGetMetadata($path);
	}

	/**
	 * Rename a file.
	 * @param string $oldpath The old file's path.
	 * @param string $newName The file's new path.
	 */
	public function executeRename($path, $newName) {
		$manager = $this->managers()->getManagerOf('file');
		$metadataManager = $this->managers()->getManagerOf('fileMetadata');
		$shareManager = $this->managers()->getManagerOf('fileShare');
		$user = $this->app()->user();

		if (strstr($newName, '/') !== false) { //Invalid file name
			throw new \InvalidArgumentException('Cannot rename file "'.$path.'" to "'.$newName.'" (invalid new file name)', 400);
		}

		$parentDirPath = $manager->dirname($path);
		$newFilePath = $parentDirPath . '/' . $newName;

		if ($manager->exists($newFilePath)) { //File name already used
			throw new \RuntimeException('Cannot rename file "'.$path.'" to "'.$newName.'" (file name already used)');
		}

		//Let's move the file
		$manager->move($path, $newFilePath);

		$internalPath = $manager->toInternalPath($path);
		if ($metadataManager->pathExists($internalPath)) {
			$fileMetadata = $metadataManager->getByPath($internalPath);

			$fileMetadata['path'] = $manager->toInternalPath($newFilePath);

			$metadataManager->update($fileMetadata);
		}

		/*if ($user->isLogged()) {
			$internalPath = $manager->toInternalPath($path);
			$share = $shareManager->getByPath($user->id(), $internalPath);

			if (!empty($share) && $internalPath == $share['path']) {
				$share->setPath($manager->toInternalPath($newFilePath));
				$shareManager->update($share);
			}
		}*/

		//Return new data
		return $this->executeGetMetadata($newFilePath);
	}

	/**
	 * Copy a file.
	 * @param string $source The source file.
	 * @param string $dest The destination directory or the destination path.
	 */
	public function executeCopy($source, $dest) {
		$manager = $this->managers()->getManagerOf('file');

		$copiedPath = $manager->copy($source, $dest, true);

		return $this->executeGetMetadata($copiedPath);
	}

	/**
	 * Move a file.
	 * @param string $source The source file.
	 * @param string $dest The destination directory or the destination path.
	 */
	public function executeMove($source, $dest) {
		$manager = $this->managers()->getManagerOf('file');
		$metadataManager = $this->managers()->getManagerOf('fileMetadata');
		$shareManager = $this->managers()->getManagerOf('fileShare');
		$user = $this->app()->user();

		$movedPath = $manager->move($source, $dest);

		$sourceInternalPath = $manager->toInternalPath($source);
		if ($metadataManager->pathExists($sourceInternalPath)) {
			$fileMetadata = $metadataManager->getByPath($sourceInternalPath);

			$fileMetadata['path'] = $manager->toInternalPath($movedPath);

			$metadataManager->update($fileMetadata);
		}

		/*if ($user->isLogged()) {
			$sourceInternalPath = $manager->toInternalPath($source);
			$share = $shareManager->getByPath($user->id(), $sourceInternalPath);

			if (!empty($share) && $sourceInternalPath == $share['path']) {
				$share->setPath($manager->toInternalPath($movedPath));
				$shareManager->update($share);
			}
		}*/

		return $this->executeGetMetadata($movedPath);
	}

	/**
	 * Delete a file.
	 * @param string $path The file to delete.
	 */
	public function executeDelete($path) {
		$manager = $this->managers()->getManagerOf('file');
		$metadataManager = $this->managers()->getManagerOf('fileMetadata');
		$shareManager = $this->managers()->getManagerOf('fileShare');
		$user = $this->app()->user();

		$manager->delete($path, true);

		$internalPath = $manager->toInternalPath($path);
		if ($metadataManager->pathExists($internalPath)) {
			$fileMetadata = $metadataManager->getByPath($internalPath);

			if ($shareManager->fileIdExists($fileMetadata['id'])) {
				$shares = $shareManager->listByFileId($fileMetadata['id']);

				foreach ($shares as $share) {
					$shareManager->delete($share['id']);
				}
			}

			$metadataManager->delete($fileMetadata['id']);
		}

		/*if ($user->isLogged()) {
			$internalPath = $manager->toInternalPath($path);
			$share = $shareManager->getByPath($user->id(), $internalPath);

			if (!empty($share) && $internalPath == $share['path']) {
				$shareManager->delete($share['id']);
			}
		}*/
	}

	/**
	 * Create a file.
	 * @param string $path The new file path.
	 */
	public function executeCreateFile($path) {
		$manager = $this->managers()->getManagerOf('file');

		if (!$manager->exists($path)) {
			$manager->createFile($path, true);
		} elseif ($manager->isDir($path)) {
			throw new \RuntimeException('Cannot create file "'.$path.'" (it is a directory)');
		}

		return $this->executeGetMetadata($path);
	}

	/**
	 * Create a directory.
	 * @param string $path The new directory path.
	 */
	public function executeCreateFolder($path) {
		$manager = $this->managers()->getManagerOf('file');

		if (!$manager->exists($path)) {
			$manager->mkdir($path, true);
		} elseif (!$manager->isDir($path)) {
			throw new \RuntimeException('Cannot create directory "'.$path.'" (it is a file)');
		}

		return $this->executeGetMetadata($path);
	}

	/**
	 * Set a file's content.
	 * @param string $path The file's path.
	 * @param string $contents The new file's content.
	 */
	public function executeSetContents($path, $contents) {
		$manager = $this->managers()->getManagerOf('file');

		if (!$manager->exists($path)) {
			$manager->createFile($path, true);
		}

		$manager->write($path, $contents);

		return $this->executeGetMetadata($path);
	}

	/**
	 * Set a file's content, base64-encoded.
	 * @param string $path The file's path.
	 * @param string $contents The new file's content, base64-encoded.
	 */
	public function executeSetContentsAsBinary($path, $contents) {
		$contents = base64_decode($contents);

		return $this->executeSetContents($path, $contents);
	}

	/**
	 * Upload a file.
	 * @param string $dest The file's destination.
	 * @return array An array containing the upload's result : "success" is set to false if an error occurs, in that case "message" contains the error message.
	 */
	public function executeUpload($dest) {
		$manager = $this->managers()->getManagerOf('file');
		$configManager = $this->managers()->getManagerOf('config');

		//Load config
		$config = $configManager->open(self::UPLOADS_CONFIG)->read();
		if (!is_array($config['allowedExtensions'])) {
			$config['allowedExtensions'] = explode(',', $config['allowedExtensions']);
		}

		//Uploads disabled
		if (!$config['enabled']) {
			return array('success' => false, 'msg' => 'File uploading is disabled');
		}

		//Destination dir doesn't exist
		if (!$manager->exists($dest) || !$manager->isDir($dest)) {
			return array('success' => false, 'msg' => 'Destination directory doesn\'t exist');
		}

		if ($this->app()->httpRequest()->getExists('file')) {
			$tmpFile = $manager->toInternalPath($manager->tmpfile());

			$inputStream = fopen('php://input', 'r');
			$tempStream = fopen($tmpFile, 'w');
			$realSize = stream_copy_to_stream($inputStream, $tempStream);
			fclose($inputStream);

			$_FILES['file'] = array(
				'error' => 0,
				'name' => $this->app()->httpRequest()->getData('file'),
				'size' => $realSize,
				'tmp_name' => $tmpFile
			);
		}

		//File not sent
		if (!isset($_FILES['file'])) {
			return array('success' => false, 'msg' => 'No file provided');
		}

		//An error has occured
		if ($_FILES['file']['error'] > 0) {
			switch($_FILES['file']['error']) {
				case UPLOAD_ERR_NO_FILE:
					$msg = 'No file provided';
					break;
				case UPLOAD_ERR_INI_SIZE:
				case UPLOAD_ERR_FORM_SIZE:
					$msg = 'File is too large';
					break;
				case UPLOAD_ERR_PARTIAL:
					$msg = 'Upload was interrupted';
					break;
				default:
					$msg = 'Error while uploading the file';
			}
			return array('success' => false, 'msg' => $msg);
		}

		//Max. file size
		if ($config['maxFileSize'] >= 0 && $_FILES['file']['size'] > $config['maxFileSize']) {
			return array('success' => false, 'msg' => 'File is too large');
		}

		//Check available space
		try {
			$manager->checkAvailableSpace($dest, $_FILES['file']['size']);
		} catch (\Exception $e) {
			return array('success' => false, 'msg' => $e->getMessage());
		}

		//File extension not allowed
		$extension = strtolower(substr(strrchr($_FILES['file']['name'], '.'), 1));
		if (!in_array('*', $config['allowedExtensions']) && !in_array($extension, $config['allowedExtensions'])) {
			return array('success' => false, 'msg' => 'File extension "'.$extension.'" is not allowed');
		}

		//Change the file name if it already exists
		$path = $dest.'/'.$_FILES['file']['name'];
		$filename = preg_replace('#\.'.$extension.'$#', '', $_FILES['file']['name']);
		$i = 2;

		while($manager->exists($path)) { //Choose another file name
			$path = $dest.'/'.$filename.'-'.$i.'.'.$extension;
			$i++;
		}

		//Copy
		$internalPath = $manager->toInternalPath($path);
		$result = copy($_FILES['file']['tmp_name'], $internalPath);

		if (!$result) { //Error while copying
			return array('success' => false, 'msg' => 'Error while copying uploaded file');
		}

		//Chmod the file to 0777
		chmod($internalPath, 0777);

		//Return uploaded file's metadata
		return array('success' => true, 'file' => $this->executeGetMetadata($path));
	}

	/**
	 * Share a file.
	 * @param  string $path The file path.
	 */
	public function executeShare($path, $opts = array()) {
		$manager = $this->managers()->getManagerOf('file');
		$metadataManager = $this->managers()->getManagerOf('fileMetadata');
		$shareManager = $this->managers()->getManagerOf('fileShare');
		$user = $this->app()->user();

		if (!$user->isLogged()) {
			throw new \RuntimeException('You must be logged in to share a file', 403);
		}

		$path = $manager->beautifyPath($path);

		if ($path != '~' && substr($path, 0, 2) != '~/') {
			throw new \RuntimeException('Cannot share files outside home directory (attempted to share file "'.$path.'")', 403);
		}

		$fileMetadata = $this->createFileMetadata($path);

		$shares = $shareManager->listByFileIdAndType($fileMetadata['id'], 'link');
		if (empty($shares)) {
			$shareKey = substr(sha1(microtime() + mt_rand() * (mt_rand() + 42)), 4, 20); //Let's generate a funny key !

			$share = new FileShare(array(
				'fileId' => $fileMetadata['id'],
				'type' => 'link',
				'date' => time(),
				'ttl' => null,
				'key' => $shareKey
			));

			$shareManager->insert($share);
		} else {
			$share = $shares[0]; //TODO: take the most appropriate existing share, or create another
		}

		$shareUrl = $this->getShareUrl($path, $share['key']);

		return $this->getFileShareData($path, $share);
	}

	/**
	 * Update a file's metadata.
	 * @param  string $path     The file path.
	 * @param  array $metadata The new file metadata.
	 */
	public function executeUpdateMetadata($path, $metadata) {
		$manager = $this->managers()->getManagerOf('file');
		$metadataManager = $this->managers()->getManagerOf('fileMetadata');

		if (!$manager->exists($path)) {
			throw new \RuntimeException('"'.$path.'": no such file or directory', 404);
		}

		$fileMetadata = $this->createFileMetadata($path);

		if (isset($metadata['tags'])) {
			$fileMetadata['tags'] = $metadata['tags'];
		}

		$metadataManager->update($fileMetadata);
		
		return $this->executeGetMetadata($path);
	}

	public function executeSearch($query, $inDir) { //WARNING: doesn't support deep permissions check
		$manager = $this->managers()->getManagerOf('file');
		$metadataManager = $this->managers()->getManagerOf('fileMetadata');

		if ($inDir != '~' && substr($inDir, 0, 2) != '~/') {
			throw new \RuntimeException('Cannot search files outside home directory (attempted to search in directory "'.$inDir.'")', 403);
		}

		//Escape the query string
		$escapedQuery = preg_quote(trim($query));
		$escapedQuery = str_replace(' ', '|', $escapedQuery); //" " = OR

		if (empty($escapedQuery)) { //Empty query
			throw new \RuntimeException('Empty search query');
		}

		$filesInDir = $manager->readDir($inDir, true);

		$matchingItems = array();

		foreach($filesInDir as $filepath) {
			$fields = array(
				'basename' => $manager->basename($filepath)
			);

			$internalPath = $manager->toInternalPath($filepath);
			if ($metadataManager->pathExists($internalPath)) {
				$fileMetadata = $metadataManager->getByPath($internalPath);

				$fields['tags'] = $fileMetadata['tags'];
			}

			$matchesNbr = 0;
			foreach ($fields as $fieldName => $fieldValue) {
				$matchesNbr += preg_match_all('#('.$escapedQuery.')#i', $fieldValue);
			}

			if ($matchesNbr > 0) {
				$matchingItem = $this->executeGetMetadata($filepath);
				$matchingItem['matchesNbr'] = $matchesNbr;
				$matchingItems[] = $matchingItem;
			}
		}

		usort($matchingItems, function($a, $b) {
			return $b['matchesNbr'] - $a['matchesNbr'];
		});

		return $matchingItems;
	}

	public function executeGetSupportedProtocols() {
		$allowedProtocols = $this->guardian()->allowedProtocols();

		return array_intersect($allowedProtocols, stream_get_wrappers());
	}
}