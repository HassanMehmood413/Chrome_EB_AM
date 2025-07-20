import { makeStyles } from "@material-ui/core/styles";
import {
  Row,
  Typography,
  Button,
  Input,
  Col,
  InputNumber,
  Checkbox,
  notification,
  Modal,
  Table,
  Tooltip,
  ConfigProvider,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

import { sleep } from "../../services/utils";
import { getLocal, setLocal } from "../../services/dbService";
import { round } from "lodash";
import { PagesLayout } from "../../components/shared/pagesLayout";
import { PageBtn } from "../../components/shared/buttons";

const { Title, Text } = Typography;
const { TextArea } = Input;

window.addEventListener("beforeunload", async () => {
  await setLocal("listing-status", null);
  await setLocal("is-bulk-listing", false);
});

const useStyles = makeStyles({
  mainDiv: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: {
    marginTop: "1px",
  },
  box: {
    gap: "5px",
    flexDirection: "column",
    width: "900px",
    background: "#f6f6f6",
    padding: "15px",
  },
  listingButtons: {
    marginTop: "5px",
    gap: "5px",
  },
});

const BulkLister = () => {
  const classes = useStyles();
  const [links, setLinks] = useState([]);
  const [newLinks, setNewLinks] = useState([]);
  const [report, setReport] = useState([]);
  const [isListing, setIsListing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [position, setPosition] = useState(0);
  const linksRef = useRef(links);
  const reportRef = useRef(report);
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [isFba, setIsFba] = useState(null);
  const [closeListing, setCloseListing] = useState(null);
  const [ignoreVero, setIgnoreVero] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(null);
  const [terminateLoading, setTerminateLoading] = useState(null);
  const [reportModel, setReportModel] = useState(false);

  const getStates = async () => {
    const minP = await getLocal("bulk-lister-min-price");
    if (minP) setMinPrice(minP);

    const maxP = await getLocal("bulk-lister-max-price");
    if (maxP) setMaxPrice(maxP);

    const fba = await getLocal("bulk-lister-fba");
    if (fba !== null) setIsFba(fba);

    const cListing = await getLocal("bulk-lister-close-listing");
    if (cListing !== null) setCloseListing(cListing);

    const ignoreVeroSetting = await getLocal("bulk-lister-ignore-vero");
    if (ignoreVeroSetting !== null) setIgnoreVero(ignoreVeroSetting);

    // Check for URLs from product hunter
    const urlsFromHunter = await getLocal("bulk-lister-urls");
    const shouldClearExisting = await getLocal("bulk-lister-clear-existing");
    
    if (urlsFromHunter && urlsFromHunter.length > 0) {
      // If clear flag is set, clear existing links first
      if (shouldClearExisting) {
        setLinks([]); // Clear existing links
        await setLocal("bulk-lister-clear-existing", false); // Reset the flag
      }
      
      setLinks(urlsFromHunter);
      // Clear the URLs from storage after loading them
      await setLocal("bulk-lister-urls", null);
      
      // Show notification that URLs were loaded
      const message = shouldClearExisting 
        ? `${urlsFromHunter.length} Amazon URLs have been loaded from Product Hunter (existing queue cleared)`
        : `${urlsFromHunter.length} Amazon URLs have been loaded from Product Hunter`;
        
      notification.success({
        message: "URLs Loaded",
        description: message
      });
    }
  };

  useEffect(() => {
    getStates();
  }, []);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  useEffect(() => {
    reportRef.current = report;
  }, [report]);

  const isValidLink = (url) => {
    // const amazonRegex = /^(https?:\/\/)?(www\.)?amazon\.(com|ca|co\.uk|de|fr|in|it|es|co\.jp|com\.br)\/(?:[^\/]+\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[\/?]|$)/;

    // (com|ca|co\.uk|de|fr|in|it|es|co\.jp|com\.br)
    const amazonRegex =
      /^(https?:\/\/)?(www\.)?amazon\.(com|ca|co\.uk|de|fr|in|it|es|co\.jp|com\.br)\/(?:[^\/]+\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[\/?]|$)/;
    // const amazonRegex = /^(https?:\/\/)?(www\.)?amazon\.com\/(?:[^\/]+\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[\/?]|$)/;

    return amazonRegex.test(url);
  };

  const processLink = async (index) => {
    const link = linksRef.current[index];
    console.log(`Processing: ${link}`);
    // Simulate processing time
    if (isValidLink(link)) {
      // await setLocal('processing-link', link);
      const asin = link.split("/")[4];
      await setLocal("listing-asin", asin);

      await chrome.runtime.sendMessage({
        payload: {
          url: `${link}?autoList=true`,
          active: false,
        },
        callback: "openTab",
      });
      await setLocal("listing-status", "listing");
      let listingStatus = "listing";
      while (listingStatus === "listing") {
        listingStatus = await getLocal("listing-status");
        console.log(
          "🚀 ~ file: BulkLister.jsx:63 ~ listingStatus:",
          listingStatus
        );
        await sleep(2);
      }
      console.log("status: ", listingStatus);
      console.log("link: ", link);
      return listingStatus;
    } else {
      notification.error({
        message: "Invalid Product Link",
        description: link,
      });
    }
  };

  const processLinks = async () => {
    await setLocal("is-bulk-listing", true);
    setIsListing(true);
    let localIndex = position;
    while (localIndex < linksRef.current.length) {
      const status = await processLink(localIndex);
      if (status === "paused") {
        await setLocal("is-bulk-listing", false);
        setPauseLoading(false);
        setIsListing(false);
        return;
      }
      if (status === "terminated") {
        setTerminateLoading(false);
        break;
      }
      if (status === "error") {
        const error = await getLocal("listing-error");
        // state issue
        const currentReport = reportRef.current;
        setReport([
          ...currentReport,
          {
            link: linksRef.current[localIndex],
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
            link: linksRef.current[localIndex],
            status: "Listed",
          },
        ]);
      }
      localIndex += 1;
      setPosition((prevIndex) => prevIndex + 1);
    }

    await setLocal("is-bulk-listing", false);
    // await setLocal('processing-link', '');
    setIsListing(false);
    setPosition(0);
    setLinks([]);
  };

  const handleListClick = () => {
    if (links.length > 0) {
      processLinks();
    }
  };

  // const handleListClick = useCallback(async () => {
  //   setIsListing(true);
  //   for (let i = 0; i < links.length; i++) {
  //     console.log('🚀 ~ file: BulkLister.jsx:52 ~ links:', links);
  //     setPosition(i + 1);
  //     const link = links[i];
  //     console.log('🚀 ~ file: BulkLister.jsx:55 ~ link:', link);
  //     await sleep(5);
  //   }
  //   setIsListing(false);
  // }, [links]);

  const handlePriceChange = async (type, value) => {
    if (type === "min") {
      setMinPrice(value);
      await setLocal("bulk-lister-min-price", value);
    } else {
      setMaxPrice(value);
      await setLocal("bulk-lister-max-price", value);
    }
  };

  const handleFbaChange = async (value) => {
    setIsFba(value);
    await setLocal("bulk-lister-fba", value);
  };

  const handleCloseListingChange = async (value) => {
    setCloseListing(value);
    await setLocal("bulk-lister-close-listing", value);
  };

  const handleIgnoreVeroChange = async (value) => {
    setIgnoreVero(value);
    await setLocal("bulk-lister-ignore-vero", value);
  };

  const handlePause = async () => {
    setPauseLoading(true);
    setIsPaused(true);
    await setLocal("listing-status", "paused");
  };

  const handleSkipCurrentLink = async () => {
    // setPauseLoading(true);
    // setIsPaused(true);
    // await setLocal('listing-status', 'paused');
    await setLocal("listing-status", "error");
    await setLocal("listing-error", "this product skipped by user");
    // await sleep(2.5);
    // const tempLinks = [...linksRef.current];
    // tempLinks.splice(position, 1);
    // setLinks(tempLinks);
    // await sleep(2.5);
    // setPosition(prev => prev - 1);
    // setIsPaused(false);
    // handleListClick();
  };

  const handleResume = async () => {
    setIsPaused(false);
    handleListClick();
  };

  const handleReset = async () => {
    setTerminateLoading(true);
    await setLocal("listing-status", "terminated");
  };

  const columns = [
    {
      key: "Link",
      title: "Link",
      dataIndex: "link",
      width: 90,
      ellipsis: {
        showTitle: false,
      },
      render: (value, data) => {
        return (
          <Tooltip title={value}>
            <a
              href={data.value}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                chrome.runtime.sendMessage({
                  payload: {
                    url: value,
                    active: false,
                  },
                  callback: "openTab",
                });
              }}
            >
              {value}
            </a>
          </Tooltip>
        );
      },
    },
    {
      key: "Status",
      title: "Status",
      dataIndex: "status",
      width: 30,
    },
    {
      key: "Error",
      title: "Error",
      dataIndex: "error",
      width: 80,
      ellipsis: {
        showTitle: false,
      },
      render: (value) => {
        return <Tooltip title={value}>{value}</Tooltip>;
      },
    },
  ];

  const styles = {
    numInput:
      "w-24 text-sm px-2 border rounded-lg border-neutral-500 bg-neutral-50 text-black",
  };

  return (
    <PagesLayout>
      <div className="w-full flex justify-center">
        <div className="container max-w-3xl">
          <div>
            <h1 className="font-bold text-2xl mb-2">Lister</h1>
            <h3 className="font-medium">
              Enter Amazon product links below, separated by new lines
            </h3>
          </div>
          <div>
            <TextArea
              value={links.join("\n")}
              onChange={(e) => {
                if (e.target.value) setLinks(e.target.value.split("\n"));
                else setLinks([]);
              }}
              className="bg-neutral-50 p-4 mt-2 max-h-80 h-40 w-full rounded-lg border"
            />
            <div className="font-medium flex flex-wrap gap-3 mt-2">
              <PageBtn
                variant="blue"
                disabled={!links.length || isPaused}
                loading={isListing}
                onClick={handleListClick}
              >
                List
              </PageBtn>
              <PageBtn
                disabled={!isListing || isPaused}
                loading={pauseLoading}
                onClick={handlePause}
              >
                Pause
              </PageBtn>
              <PageBtn disabled={!isPaused} onClick={handleResume}>
                Resume
              </PageBtn>
              <PageBtn
                disabled={isListing || !links.length || isPaused}
                onClick={() => setLinks([])}
              >
                Clear Links
              </PageBtn>
              <PageBtn variant="blue" onClick={() => handleSkipCurrentLink()}>
                Skip Current Link
              </PageBtn>
              <PageBtn
                variant="red"
                disabled={!isListing || isPaused}
                loading={terminateLoading}
                onClick={handleReset}
              >
                Reset & Terminate
              </PageBtn>
            </div>
            <div className="flex gap-4 flex-wrap mt-4">
              <div className="flex items-center gap-2">
                <span>Min Price: </span>
                <InputNumber
                  min={1}
                  value={minPrice}
                  onChange={(val) => handlePriceChange("min", val)}
                  className={styles.numInput}
                />
              </div>
              <div className="flex items-center gap-2">
                <span>Max Price: </span>
                <InputNumber
                  min={1}
                  value={maxPrice}
                  onChange={(val) => handlePriceChange("max", val)}
                  className={styles.numInput}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={ignoreVero}
                  onChange={async (ee) => handleIgnoreVeroChange(ee.target.checked)}
                >
                  Ignore VeRO Protection
                </Checkbox>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isFba}
                  onChange={async (ee) => handleFbaChange(ee.target.checked)}
                >
                  Require Prime/FBA Only
                </Checkbox>
              </div>
            </div>
            <div className="mt-4 flex justify-between">
              <Checkbox
                checked={closeListing}
                onChange={async (ee) =>
                  handleCloseListingChange(ee.target.checked)
                }
              >
                Close Errored Listing
              </Checkbox>
              <p>
                {links.length ? round((position / links.length) * 100, 2) : 0}%
                - Total Progress
              </p>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <h3 className="font-medium mt-6 mb-2">
                  Add More Links To Running List
                </h3>
                <PageBtn
                  variant="blue"
                  disabled={!newLinks.length}
                  onClick={useCallback(() => {
                    setLinks((prev) => [...prev, ...newLinks]);
                    setNewLinks([]);
                  }, [links, newLinks])}
                >
                  Add
                </PageBtn>
              </div>
              <TextArea
                value={newLinks.join("\n")}
                onChange={(e) => {
                  if (e.target.value) setNewLinks(e.target.value.split("\n"));
                  else setNewLinks([]);
                }}
                className="bg-neutral-50 p-4 mt-2 max-h-40 h-20 w-full rounded-lg border"
              />
            </div>
          </div>
          <div>
            <h3 className="font-medium my-2">Status Report Table</h3>
            <div className="border rounded-lg">
              <ConfigProvider>
                <Table
                  columns={columns}
                  loading={false}
                  dataSource={report || []}
                  pagination={false}
                />
              </ConfigProvider>
            </div>
          </div>
        </div>
      </div>
    </PagesLayout>
  );

  return (
    <div className={classes.mainDiv}>
      <Row>
        <Title className={classes.header} level={2}>
          Lister
        </Title>
      </Row>
      <Row className={classes.box}>
        <Title level={5} style={{ marginTop: "0px", marginBottom: "0px" }}>
          Enter Amazon product links below, separated by new lines:
        </Title>
        <TextArea
          rows={10}
          value={links.join("\n")}
          onChange={(e) => {
            if (e.target.value) setLinks(e.target.value.split("\n"));
            else setLinks([]);
          }}
        />
        <Row className={classes.listingButtons}>
          <Button
            type="primary"
            disabled={!links.length || isPaused}
            loading={isListing}
            onClick={handleListClick}
          >
            List
          </Button>
          <Button
            type="primary"
            disabled={!isListing || isPaused}
            loading={pauseLoading}
            onClick={handlePause}
          >
            Pause
          </Button>
          <Button type="primary" disabled={!isPaused} onClick={handleResume}>
            Resume
          </Button>
          <Button
            danger
            type="primary"
            disabled={isListing || !links.length || isPaused}
            onClick={() => setLinks([])}
          >
            Clear Links
          </Button>
          <Button
            danger
            type="primary"
            disabled={!isListing || isPaused}
            loading={terminateLoading}
            onClick={handleReset}
          >
            Reset & Terminate
          </Button>
        </Row>
        <Row className={classes.listingButtons}>
          <Col>
            <Text className="!mb-0">Position: </Text>
            <InputNumber
              value={isListing ? position + 1 : position}
              disabled={true}
            />
            <Text className="!mb-0"> / {links.length}</Text>
          </Col>
          <Col>
            <Button type="primary" onClick={() => setReportModel(true)}>
              Status Report
            </Button>
          </Col>
          <Col>
            <Button type="primary" onClick={() => handleSkipCurrentLink()}>
              Skip Current Link
            </Button>
          </Col>
        </Row>
        {/* <Row className={classes.listingButtons}>
          <Col>
            <Text
              className='!mb-0'
            >
              Thread Count: {' '}
            </Text>
            <Select
              defaultValue={1}
              options={[
                {
                  label: '1',
                  value: 1
                },
                {
                  label: '2',
                  value: 2
                },
                {
                  label: '3',
                  value: 3
                }
              ]}
            />
          </Col>
        </Row> */}
        <Row
          style={{
            marginTop: "5px",
            gap: "5px",
          }}
        >
          <Col>
            <Text>Min Price: </Text>
            <InputNumber
              min={1}
              value={minPrice}
              onChange={(val) => handlePriceChange("min", val)}
            />
          </Col>
          <Col>
            <Text>Max Price: </Text>
            <InputNumber
              min={1}
              value={maxPrice}
              onChange={(val) => handlePriceChange("max", val)}
            />
          </Col>
        </Row>
        <Row style={{ marginTop: "10px" }}>
          <Col>
            <Checkbox
              checked={ignoreVero}
              onChange={async (ee) => handleIgnoreVeroChange(ee.target.checked)}
            >
              Ignore VeRO Protection
            </Checkbox>
          </Col>
        </Row>
        <Row style={{ marginTop: "10px" }}>
          <Col>
            <Checkbox
              checked={isFba}
              onChange={async (ee) => handleFbaChange(ee.target.checked)}
            >
              Require Prime/FBA Only
            </Checkbox>
          </Col>
        </Row>
        {/* <Checkbox
          checked={isFba}
          onChange={async (ee) => handleFbaChange(ee.target.checked)}
        >
          FBA Only
        </Checkbox> */}
        <Checkbox
          checked={closeListing}
          onChange={async (ee) => handleCloseListingChange(ee.target.checked)}
        >
          Close Errored Listing
        </Checkbox>
        <Row>
          <Text>
            Progress{" "}
            {links.length ? round((position / links.length) * 100, 2) : 0}%
          </Text>
        </Row>
        <Title level={5} style={{ marginTop: "0px", marginBottom: "0px" }}>
          Add more links to running list:
        </Title>
        <Row
          style={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: "5px",
          }}
        >
          <TextArea
            rows={2}
            value={newLinks.join("\n")}
            onChange={(e) => {
              if (e.target.value) setNewLinks(e.target.value.split("\n"));
              else setNewLinks([]);
            }}
          />
          <Row style={{ gap: "5px" }}>
            {/* <Button type='primary' style={{ height: '26px', width: '60px' }}>Import</Button> */}
            <Button
              type="primary"
              style={{ height: "26px", width: "60px" }}
              disabled={!newLinks.length}
              onClick={useCallback(() => {
                setLinks((prev) => [...prev, ...newLinks]);
                setNewLinks([]);
              }, [links, newLinks])}
            >
              Add
            </Button>
          </Row>
        </Row>
      </Row>
      <Modal
        title="Status Report"
        className="create-location"
        centered
        width={800}
        open={reportModel}
        footer={null}
        onCancel={() => setReportModel(false)}
      >
        <Table
          style={{ height: "60vh" }}
          loading={false}
          columns={columns}
          dataSource={report || []}
          pagination={false}
          scroll={{ y: 500, x: 600 }}
        />
      </Modal>
    </div>
  );
};

export default BulkLister;
