import React, { useState, useRef, useEffect } from "react";
import {
  Input,
  Button,
  Select,
  Card,
  Typography,
  Space,
  notification,
} from "antd";
import "antd/dist/reset.css";

import {
  getLocal,
  setLocal,
  onChange as onChangeLocalState,
} from "../../services/dbService";
import { sleep } from "../../services/utils";
import { PagesLayout } from "../../components/shared/pagesLayout";
import { PageBtn } from "../../components/shared/buttons";

const { TextArea } = Input;
const { Title } = Typography;

window.addEventListener("beforeunload", async () => {
  await setLocal("competitor-search-status", null);
  await setLocal("is-competitor-search", null);
});

const CompetitorScanner = () => {
  const [currentScanningUser, setCurrentScanningUser] = useState("");
  const [isCompetitorSearch, setIsCompetitorSearch] = useState(false);
  const [position, setPosition] = useState(0);
  const [totalCompetitorSearch, setTotalCompetitorSearch] = useState(0);
  const [soldWithin, setSoldWithin] = useState(90);
  const [domain, setDomain] = useState("");
  const [sellerNames, setSellerNames] = useState([]);
  const [currentUser, setCurrentUser] = useState([]);
  const sellerNamesRef = useRef(sellerNames);
  const [report, setReport] = useState([]);
  const reportRef = useRef(report);

  useEffect(() => {
    const checkEbayScrappedProducts = async () => {
      const currentUserId = await getLocal("current-user");
      const soldWithin = await getLocal("competitor-search-sold-within");
      if (!soldWithin) {
        await setLocal("competitor-search-sold-within", 90);
        setSoldWithin(90);
      } else {
        setSoldWithin(soldWithin);
      }
      await setLocal("is-competitor-search", false);
      setIsCompetitorSearch(false);
      setCurrentUser(currentUserId);
      const domain = await getLocal(`selected-domain-${currentUserId}`);
      setDomain(domain);
      const localSellerNames = await getLocal(
        "competitor-search-seller-names-persisted"
      );
      if (localSellerNames?.length) {
        setSellerNames(localSellerNames);
        setTotalCompetitorSearch(localSellerNames.length);
      }

      onChangeLocalState(
        "competitor-search-seller-names-persisted",
        (param1, newValue) => {
          setSellerNames(newValue);
        }
      );
    };

    checkEbayScrappedProducts();
  }, []);

  useEffect(() => {
    sellerNamesRef.current = sellerNames;
    setTotalCompetitorSearch(sellerNames.length);
  }, [sellerNames]);

  const processSeller = async (index) => {
    const sellerName = sellerNamesRef.current[index];
    setCurrentScanningUser(sellerName);
    await setLocal("is-competitor-search", true);
    console.log(`Processing: ${sellerName}`);
    // Simulate processing time
    if (sellerName) {
      let baseUrl = "https://www.ebay.co.uk";
      if (domain === "USA") {
        baseUrl = "https://www.ebay.com";
      }

      console.log("\n baseUrl", baseUrl);
      await chrome.runtime.sendMessage({
        payload: {
          url: `${baseUrl}/sch/i.html?_ssn=${sellerName}&store_name=${sellerName}&_ipg=240&_oac=1&LH_Sold=1&Competitor_Search=true`,
          active: false,
        },
        callback: "openTab",
      });
      console.log("link: ", sellerName);
      await setLocal("competitor-search-status", "scrapping");
      let competitorSearchStatus = "scrapping";
      while (competitorSearchStatus === "scrapping") {
        competitorSearchStatus = await getLocal("competitor-search-status");
        console.log(
          "🚀 ~ file: Competitor Search.jsx:63 ~ competitorSearchStatus:",
          competitorSearchStatus
        );
        await sleep(2);
      }
      console.log("status: ", competitorSearchStatus);
      return competitorSearchStatus;
    } else {
      notification.error({
        message: "Invalid Seller Name",
        description: sellerName,
      });
    }
  };

  const processSellers = async () => {
    setIsCompetitorSearch(true);
    let localIndex = position;
    while (localIndex < sellerNamesRef.current.length) {
      const status = await processSeller(localIndex);
      if (status === "stop") {
        setIsCompetitorSearch(false);
        return;
      }
      if (status === "error") {
        const error = await getLocal("competitor-search-error");
        // state issue
        const currentReport = reportRef.current;
        setReport([
          ...currentReport,
          {
            name: sellerNamesRef.current[localIndex],
            status: "Error",
            error,
          },
        ]);
      }
      if (status === "success") {
        const currentReport = reportRef.current;
        setReport([
          ...currentReport,
          {
            name: sellerNamesRef.current[localIndex],
            status: "Scrapping Done",
          },
        ]);
        await setLocal("is-competitor-search", null);
      }
      localIndex += 1;
      setPosition((prevIndex) => prevIndex + 1);
    }

    notification.success({
      message: "Competitor Search",
      description: "Search Completed",
      duration: 0,
    });
    setIsCompetitorSearch(false);
    setPosition(0);
  };

  const handleProcessSellers = () => {
    console.log("\n sellerNames", sellerNames);
    if (sellerNames.length > 0) {
      processSellers();
    }
  };

  const handleStop = async () => {
    setIsCompetitorSearch(false);
    await setLocal("competitor-search-status", "stop");
  };

  const setCompetitorSearchFilters = async (key, value) => {
    console.log("\n setCompetitorSearchFilters", key, typeof value, value);
    await setLocal([key], value);
  };

  const handleReset = async () => {
    await setLocal("competitor-search-seller-names-persisted", []);
    setSellerNames([]);
  };

  const ChangeSellersList = async (value) => {
    await setLocal("competitor-search-seller-names", []);

    let name = value.split("\n");
    // titles = titles.filter(title => title);
    name = [...new Set(name)];
    console.log("🚀 ~ ChangeSellersList ~ name:", name);

    let chromeStorageNames = await getLocal("competitor-search-seller-names");
    if (chromeStorageNames.length) {
      chromeStorageNames = [...chromeStorageNames, ...name];
      chromeStorageNames = [...new Set(chromeStorageNames)];
      console.log(
        "🚀 ~ ChangeSellersList ~ chromeStorageNames:",
        chromeStorageNames
      );

      await setLocal("competitor-search-seller-names", chromeStorageNames);
      await setLocal(
        "competitor-search-seller-names-persisted",
        chromeStorageNames
      );

      setSellerNames(chromeStorageNames);
    } else {
      if (value) {
        await setLocal("competitor-search-seller-names", name);
        await setLocal("competitor-search-seller-names-persisted", name);
        setSellerNames(name);
      } else {
        await setLocal("competitor-search-seller-names", []);
        await setLocal("competitor-search-seller-names-persisted", []);
        setSellerNames([]);
      }
    }
  };

  return (
    <PagesLayout dimensions="max-w-4xl">
      <div className="w-full flex justify-center">
        <div className="container max-w-lg space-y-4">
          <h1 className="font-bold text-2xl">Competitor x Scanner</h1>
          <TextArea
            rows={6}
            className="max-h-40 my-1"
            placeholder="Enter competitors..."
            value={sellerNames.join("\n")}
            onChange={(e) => ChangeSellersList(e.target.value)}
          />
          <div className="flex justify-between gap-2">
            <div className="flex gap-2">
              <PageBtn
                variant="blue"
                onClick={() => handleProcessSellers()}
                disabled={isCompetitorSearch || !sellerNames.length}
                loading={isCompetitorSearch}
              >
                Run
              </PageBtn>
              <PageBtn
                onClick={() => handleStop()}
                disabled={!isCompetitorSearch}
              >
                Stop
              </PageBtn>
            </div>
            <PageBtn
              variant="red"
              onClick={handleReset}
              disabled={isCompetitorSearch}
            >
              Reset (Removes All Items)
            </PageBtn>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between items-center gap-2">
              <p>Get Total Sold History:</p>
              <Select
                defaultValue="off"
                style={{ width: 120 }}
                options={[
                  { value: false, label: "Off" },
                  { value: true, label: "On" },
                ]}
                onChange={(e) =>
                  setCompetitorSearchFilters(
                    "competitor-search-sold-history",
                    e
                  )
                }
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <p>Only Scan Items That Sold within:</p>
              <Select
                defaultValue="Last 90 Days"
                style={{ width: 120 }}
                value={soldWithin}
                options={[
                  { value: 1, label: "Last 1 Day" },
                  { value: 3, label: "Last 3 Days" },
                  { value: 7, label: "Last 7 Days" },
                  { value: 14, label: "Last 14 Days" },
                  { value: 21, label: "Last 21 Days" },
                  { value: 30, label: "Last 30 Days" },
                  { value: 60, label: "Last 60 Days" },
                  { value: 90, label: "Last 90 Days" },
                ]}
                onChange={(e) => {
                  setSoldWithin(e);
                  setCompetitorSearchFilters(
                    "competitor-search-sold-within",
                    e
                  );
                }}
              />
            </div>
          </div>
          <div className="text-sm">
            <div className="flex gap-2 items-center">
              <span>Current Position:</span>
              <span>{isCompetitorSearch ? position + 1 : position}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span>Competitor Count:</span>
              <span>{totalCompetitorSearch || 0}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span>Scanning User: {currentScanningUser}</span>
              <span />
            </div>
          </div>
          <div className="flex justify-end">
            <PageBtn
              variant="blue"
              className="show-items-btn"
              onClick={() =>
                chrome.tabs.create({
                  url: chrome.runtime.getURL("ebay-items-scanner.html"),
                })
              }
            >
              Show All Items
            </PageBtn>
          </div>
        </div>
      </div>
    </PagesLayout>
  );

  return (
    <div className="container">
      <Title level={2} style={{ textAlign: "center", marginBottom: "2rem" }}>
        Competitor x Scanner
      </Title>

      <div className="main-content">
        <div className="scanner-inputs">
          <TextArea
            rows={6}
            placeholder="Enter competitors..."
            style={{ marginBottom: "1rem" }}
            value={sellerNames.join("\n")}
            onChange={(e) => ChangeSellersList(e.target.value)}
          />

          <Space style={{ marginBottom: "1.5rem" }}>
            <Button
              type="primary"
              onClick={() => handleProcessSellers()}
              disabled={isCompetitorSearch || !sellerNames.length}
              loading={isCompetitorSearch}
            >
              Run
            </Button>
            <Button onClick={() => handleStop()} disabled={!isCompetitorSearch}>
              Stop
            </Button>
            <Button onClick={handleReset} disabled={isCompetitorSearch}>
              Reset (Removes All Items)
            </Button>
          </Space>

          <div className="controls">
            <div className="control-item">
              <span className="control-label">Get Total Sold History:</span>
              <Select
                defaultValue="off"
                style={{ width: 120 }}
                options={[
                  { value: false, label: "Off" },
                  { value: true, label: "On" },
                ]}
                onChange={(e) =>
                  setCompetitorSearchFilters(
                    "competitor-search-sold-history",
                    e
                  )
                }
              />
            </div>

            <div className="control-item">
              <span className="control-label">
                Only Scan Items That Sold within:
              </span>
              <Select
                defaultValue="Last 90 Days"
                style={{ width: 120 }}
                value={soldWithin}
                options={[
                  { value: 1, label: "Last 1 Day" },
                  { value: 3, label: "Last 3 Days" },
                  { value: 7, label: "Last 7 Days" },
                  { value: 14, label: "Last 14 Days" },
                  { value: 21, label: "Last 21 Days" },
                  { value: 30, label: "Last 30 Days" },
                  { value: 60, label: "Last 60 Days" },
                  { value: 90, label: "Last 90 Days" },
                ]}
                onChange={(e) => {
                  setSoldWithin(e);
                  setCompetitorSearchFilters(
                    "competitor-search-sold-within",
                    e
                  );
                }}
              />
            </div>

            {/* <div className='control-item'>
              <span className='control-label'>Scanning Speed:</span>
              <Select
                defaultValue='1'
                style={{ width: 120 }}
                options={[
                  { value: '1', label: '1' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' }
                ]}
              />
            </div> */}
          </div>
        </div>

        <Card className="status-card">
          <div className="status-content">
            <div className="status-item">
              <span>Current Position:</span>
              <span>{isCompetitorSearch ? position + 1 : position}</span>
            </div>
            <div className="status-item">
              <span>Competitor Count:</span>
              <span>{totalCompetitorSearch || 0}</span>
            </div>
            <div className="status-item">
              <span>Scanning User: {currentScanningUser}</span>
              <span />
            </div>
          </div>
        </Card>
      </div>

      <div className="footer">
        <Button
          type="primary"
          className="show-items-btn"
          onClick={() =>
            chrome.tabs.create({
              url: chrome.runtime.getURL("ebay-items-scanner.html"),
            })
          }
        >
          Show All Items
        </Button>
      </div>
    </div>
  );
};

export default CompetitorScanner;
