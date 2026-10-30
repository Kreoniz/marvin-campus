package vuc

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"os"
)

const MaxOriginalBytes = 16 << 20
const maxOriginalTotalBytes = 64 << 20

type Original struct {
	Data        []byte
	Filename    string
	ContentType string
}

// LoadOriginals is called before serving requests. Only dataset hashes are
// allowed filenames; verified bytes are retained so later file replacements
// cannot change a download. An empty directory setting disables downloads.
func (s *Store) LoadOriginals(directory string) error {
	if directory == "" {
		if s != nil {
			s.originals = nil
		}
		return nil
	}
	if s == nil {
		return errors.New("VUC originals require a dataset")
	}
	root, err := os.OpenRoot(directory)
	if err != nil {
		return err
	}
	defer root.Close()
	verified := map[string]Original{}
	seen := map[string]bool{}
	total := 0
	for _, entry := range s.data.Schedules {
		hash := entry.DocumentSHA256
		if seen[hash] {
			continue
		}
		seen[hash] = true
		for _, extension := range []string{".pdf", ".docx"} {
			data, err := readOriginal(root, hash+extension)
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			if err != nil {
				return fmt.Errorf("VUC original %s: %w", hash, err)
			}
			if fmt.Sprintf("%x", sha256.Sum256(data)) != hash {
				return fmt.Errorf("VUC original %s: SHA-256 mismatch", hash)
			}
			contentType := "application/pdf"
			if extension == ".pdf" {
				if !bytes.HasPrefix(data, []byte("%PDF-")) {
					return errors.New("VUC original is not a PDF")
				}
			} else {
				if !isDOCX(data) {
					return errors.New("VUC original is not a DOCX")
				}
				contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
			}
			total += len(data)
			if total > maxOriginalTotalBytes {
				return errors.New("VUC originals exceed 64 MiB in total")
			}
			verified[hash] = Original{Data: data, Filename: "vuc-" + hash[:12] + extension, ContentType: contentType}
			break
		}
	}
	s.originals = verified
	return nil
}

func readOriginal(root *os.Root, filename string) ([]byte, error) {
	info, err := root.Lstat(filename)
	if err != nil {
		return nil, err
	}
	if !info.Mode().IsRegular() || info.Size() > MaxOriginalBytes {
		return nil, errors.New("VUC original must be a regular file up to 16 MiB")
	}
	file, err := root.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	info, err = file.Stat()
	if err != nil {
		return nil, err
	}
	if !info.Mode().IsRegular() || info.Size() > MaxOriginalBytes {
		return nil, errors.New("VUC original must be a regular file up to 16 MiB")
	}
	data, err := io.ReadAll(io.LimitReader(file, MaxOriginalBytes+1))
	if err != nil {
		return nil, err
	}
	if len(data) > MaxOriginalBytes {
		return nil, errors.New("VUC original exceeds 16 MiB")
	}
	return data, nil
}

func isDOCX(data []byte) bool {
	archive, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return false
	}
	contentTypes, document := false, false
	for _, file := range archive.File {
		contentTypes = contentTypes || file.Name == "[Content_Types].xml"
		document = document || file.Name == "word/document.xml"
	}
	return contentTypes && document
}

func (s *Store) Original(id string) (Original, bool) {
	for _, entry := range s.data.Schedules {
		if entry.ID == id {
			original, ok := s.originals[entry.DocumentSHA256]
			return original, ok
		}
	}
	return Original{}, false
}
