<?php

namespace Wrappers;

/**
 * An interface for stream wrappers.
 * @see http://php.net/manual/en/class.streamwrapper.php#92277
 */
interface WrapperInterface {
	/**
	 * The current context, or NULL if no context was passed to the caller function. 
	 * @var resource
	 */
	//public $context;

	/**
	 *  Close directory handle.
	 * @return bool
	 */
	public function dir_closedir();

	/**
	 * Open directory handle.
	 * @param string $path
	 * @param int $options
	 * @return bool
	 */
	public function dir_opendir($path , $options);

	/**
	 * Read entry from directory handle.
	 * @return string
	 */
	public function dir_readdir();

	/**
	 * Rewind directory handle.
	 * @return bool
	 */
	public function dir_rewinddir();

	/**
	 * Create a directory.
	 * @param string $path
	 * @param int $mode
	 * @param int $options
	 * @return bool
	 */
	public function mkdir($path , $mode , $options);

	/**
	 * Renames a file or directory.
	 * @param string $path_from
	 * @param string $path_to
	 * @return bool
	 */
	public function rename($path_from , $path_to);

	/**
	 * Removes a directory.
	 * @param string $path
	 * @param int $options
	 * @return bool
	 */
	public function rmdir($path , $options);

	/**
	 * Retrieve the underlaying resource.
	 * @param int $cast_as
	 * @return resource
	 */
	public function stream_cast($cast_as);

	/**
	 * Close a resource.
	 */
	public function stream_close();

	/**
	 * Tests for end-of-file on a file pointer.
	 * @return bool
	 */
	public function stream_eof();

	/**
	 * Flushes the output.
	 * @return bool
	 */
	public function stream_flush();

	/**
	 * Advisory file locking.
	 * @param mode $operation
	 * @return bool
	 */
	public function stream_lock($operation);

	/**
	 * Change stream options.
	 * @param  string $path
	 * @param  int $option
	 * @param  mixed $value
	 * @return bool
	 */
	public function stream_metadata($path, $option, $value);

	/**
	 * Opens file or URL.
	 * @param string $path
	 * @param string $mode
	 * @param int $options
	 * @param string &$opened_path
	 * @return bool
	 */
	public function stream_open($path, $mode, $options, &$opened_path);

	/**
	 * Read from stream.
	 * @param int $count
	 * @return string
	 */
	public function stream_read($count);

	/**
	 * Seeks to specific location in a stream.
	 * @param int $offset
	 * @param int $whence = SEEK_SET
	 * @return bool
	 */
	public function stream_seek($offset, $whence = SEEK_SET);

	/**
	 * Change stream options.
	 * @param int $option
	 * @param int $arg1
	 * @param int $arg2
	 * @return bool
	 */
	public function stream_set_option($option, $arg1, $arg2);

	/**
	 * Retrieve information about a file resource.
	 * @return array
	 */
	public function stream_stat();

	/**
	 * Retrieve the current position of a stream.
	 * @return int
	 */
	public function stream_tell();

	/**
	 * Truncate stream.
	 * @param  int $new_size
	 * @return bool
	 */
	public function stream_truncate($new_size);

	/**
	 * Write to stream.
	 * @param string $data
	 * @return int
	 */
	public function stream_write($data);

	/**
	 * Delete a file
	 * @param string $path
	 * @return bool
	 */
	public function unlink($path);

	/**
	 * Retrieve information about a file.
	 * @param string $path
	 * @param int $flags
	 * @return array
	 */
	public function url_stat($path , $flags);
}