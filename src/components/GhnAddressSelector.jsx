import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  fetchGhnDistricts,
  fetchGhnProvinces,
  fetchGhnShippingStatus,
  fetchGhnWards,
  filterGhnAddressItems,
  getDistrictLabels,
  getProvinceLabels,
  getWardLabels,
  matchesAddressQuery,
} from '../utils/ghnAddressApi';
import './GhnAddressSelector.css';

function SearchableAddressField({
  label,
  placeholder,
  required = false,
  disabled = false,
  items,
  loading = false,
  selectedLabel = '',
  getLabels,
  getKey,
  onSelect,
  onManualChange,
  name,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selectedLabel || '');
  }, [selectedLabel]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const filteredItems = useMemo(
    () => filterGhnAddressItems(
      items.filter((item) => matchesAddressQuery(item, query, getLabels)),
      getLabels,
    ),
    [items, query, getLabels],
  );

  const handleInputChange = (event) => {
    const next = event.target.value;
    setQuery(next);
    setOpen(true);
    onManualChange?.(next);
  };

  const handlePick = (item) => {
    const label = getLabels(item)[0] || '';
    setQuery(label);
    setOpen(false);
    onSelect(item);
  };

  return (
    <div className="ghn-address-field" ref={rootRef}>
      <label className="ghn-address-label">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        type="text"
        className="input ghn-address-input"
        name={name}
        value={query}
        placeholder={placeholder}
        required={required}
        disabled={disabled || loading}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        onFocus={() => setOpen(true)}
        onChange={handleInputChange}
      />
      {open && !disabled && (
        <ul id={listId} className="ghn-address-dropdown" role="listbox">
          {loading ? (
            <li className="ghn-address-option is-muted">Đang tải...</li>
          ) : filteredItems.length === 0 ? (
            <li className="ghn-address-option is-muted">Không tìm thấy — thử gõ thêm ký tự</li>
          ) : (
            filteredItems.slice(0, 80).map((item) => (
              <li key={getKey(item)}>
                <button
                  type="button"
                  className="ghn-address-option"
                  role="option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handlePick(item)}
                >
                  {getLabels(item)[0]}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default function GhnAddressSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}) {
  const [ghnReady, setGhnReady] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const status = await fetchGhnShippingStatus();
      if (cancelled || !status?.enabled || !status?.configured) {
        setGhnReady(false);
        return;
      }
      setGhnReady(true);
      setLoadingProvinces(true);
      try {
        const items = await fetchGhnProvinces();
        if (!cancelled) setProvinces(filterGhnAddressItems(items, getProvinceLabels));
      } catch {
        if (!cancelled) setGhnReady(false);
      } finally {
        if (!cancelled) setLoadingProvinces(false);
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ghnReady || !value.provinceId) {
      setDistricts([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    fetchGhnDistricts(value.provinceId)
      .then((items) => {
        if (!cancelled) setDistricts(filterGhnAddressItems(items, getDistrictLabels));
      })
      .catch(() => {
        if (!cancelled) setDistricts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ghnReady, value.provinceId]);

  useEffect(() => {
    if (!ghnReady || !value.districtId) {
      setWards([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingWards(true);
    fetchGhnWards(value.districtId)
      .then((items) => {
        if (!cancelled) setWards(filterGhnAddressItems(items, getWardLabels));
      })
      .catch(() => {
        if (!cancelled) setWards([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingWards(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ghnReady, value.districtId]);

  const patch = (next) => onChange?.({ ...value, ...next });

  if (!ghnReady) {
    return (
      <div className={`ghn-address-grid ${className}`.trim()}>
        <input
          required
          name="province"
          type="text"
          className="input"
          placeholder="Tỉnh/Thành phố (vd: Hồ Chí Minh)"
          value={value.province || ''}
          disabled={disabled}
          onChange={(event) => patch({
            province: event.target.value,
            provinceId: null,
            district: '',
            districtId: null,
            ward: '',
            wardCode: '',
          })}
        />
        <input
          required
          name="district"
          type="text"
          className="input"
          placeholder="Quận/Huyện (vd: Quận 1)"
          value={value.district || ''}
          disabled={disabled}
          onChange={(event) => patch({
            district: event.target.value,
            districtId: null,
            ward: '',
            wardCode: '',
          })}
        />
        <input
          name="ward"
          type="text"
          className="input"
          placeholder="Phường/Xã (vd: Phường Bến Nghé)"
          value={value.ward || ''}
          disabled={disabled}
          onChange={(event) => patch({ ward: event.target.value, wardCode: '' })}
        />
        <p className="ghn-address-hint">GHN chưa bật — nhập địa chỉ thủ công.</p>
      </div>
    );
  }

  return (
    <div className={`ghn-address-grid ${className}`.trim()}>
      <SearchableAddressField
        label="Tỉnh / Thành phố"
        placeholder="Gõ H, Ho, Hồ Chí Minh..."
        required
        disabled={disabled}
        name="province"
        items={provinces}
        loading={loadingProvinces}
        selectedLabel={value.province || ''}
        getLabels={getProvinceLabels}
        getKey={(item) => item.ProvinceID}
        onManualChange={(next) => patch({
          province: next,
          provinceId: null,
          district: '',
          districtId: null,
          ward: '',
          wardCode: '',
        })}
        onSelect={(item) => patch({
          provinceId: item.ProvinceID,
          province: item.ProvinceName,
          district: '',
          districtId: null,
          ward: '',
          wardCode: '',
        })}
      />
      <SearchableAddressField
        label="Quận / Huyện"
        placeholder={value.provinceId ? 'Gõ Quận 1, Q1...' : 'Chọn tỉnh trước'}
        required
        disabled={disabled || !value.provinceId}
        name="district"
        items={districts}
        loading={loadingDistricts}
        selectedLabel={value.district || ''}
        getLabels={getDistrictLabels}
        getKey={(item) => item.DistrictID}
        onManualChange={(next) => patch({
          district: next,
          districtId: null,
          ward: '',
          wardCode: '',
        })}
        onSelect={(item) => patch({
          districtId: item.DistrictID,
          district: item.DistrictName,
          ward: '',
          wardCode: '',
        })}
      />
      <SearchableAddressField
        label="Phường / Xã"
        placeholder={value.districtId ? 'Gõ tên phường...' : 'Chọn quận trước'}
        required
        disabled={disabled || !value.districtId}
        name="ward"
        items={wards}
        loading={loadingWards}
        selectedLabel={value.ward || ''}
        getLabels={getWardLabels}
        getKey={(item) => item.WardCode}
        onManualChange={(next) => patch({ ward: next, wardCode: '' })}
        onSelect={(item) => patch({
          wardCode: item.WardCode,
          ward: item.WardName,
        })}
      />
      <p className="ghn-address-hint">
        Ô cuối chỉ nhập <strong>số nhà, tên đường</strong>. Tỉnh / Quận / Phường đã chọn ở trên.
      </p>
    </div>
  );
}
